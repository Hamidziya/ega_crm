import ticketModel from "../models/tickets.js";
import { Status } from "../common/utils.js";
import user from "../models/user.js";

// Create Ticket
const createTicket = async (req, res) => {
  try {
    const { title, imageUrl, description } = req.body;
    if (title && imageUrl && description) {
      await ticketModel.create({
        title,
        imageUrl,
        description,
        createdBy: req.headers.userId,
        isDelete: false,
        isActive: true
      });

      res.status(201).send({
        message: "Ticket Created, Sent for Approval"
      });
    } else {
      res.status(400).send({
        message: "Title, Image Url, Description are required",
      });
    }
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Get All Tickets (only non-deleted)
const getAllTickets = async (req, res) => {
  try {
    let tickets = await ticketModel.find(
      { isDelete: false },
      { _id: 1, title: 1, imageUrl: 1, createdAt: 1, status: 1, reason: 1 }
    ).sort({ createdAt: 1 });

    const totalTickets = tickets.length;
    const approvedTickets = tickets.filter(ticket => ticket.status === Status.APPROVED).length;
    const resolvedTickets = tickets.filter(ticket => ticket.status === Status.RESOLVED).length;
    const pendingTickets = tickets.filter(ticket => ticket.status === Status.PENDING).length;

    res.status(200).send({
      message: "Tickets Fetched Successfully",
      tickets,
      totalTickets,
      approvedTickets,
      resolvedTickets,
      pendingTickets
    });

  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Get All Pending Tickets (only non-deleted)
const getAllPendingTickets = async (req, res) => {
  try {
    let tickets = await ticketModel.find(
      { status: Status.PENDING, isDelete: false },
      { _id: 1, title: 1, imageUrl: 1, createdAt: 1, status: 1, reason: 1 }
    ).sort({ createdAt: 1 });

    const totalTickets = tickets.length;
    const approvedTickets = tickets.filter(ticket => ticket.status === Status.APPROVED).length;
    const resolvedTickets = tickets.filter(ticket => ticket.status === Status.RESOLVED).length;
    const pendingTickets = tickets.filter(ticket => ticket.status === Status.PENDING).length;

    res.status(200).send({
      message: "Tickets Fetched Successfully",
      tickets,
      totalTickets,
      approvedTickets,
      resolvedTickets,
      pendingTickets
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Get Ticket by Id (must not be soft deleted)
const getTicketById = async (req, res) => {
  try {
    const ticketId = req.params.id;
    if (ticketId) {
      let ticket = await ticketModel.findOne({ _id: ticketId, isDelete: false });
      if (!ticket) {
        return res.status(404).send({ message: "Ticket not found" });
      }
      res.status(200).send({
        message: "Ticket Data Fetched Successfully",
        ticket
      });
    } else {
      res.status(400).send({ message: "Ticket Id Not found" });
    }
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Get Tickets by UserId (only non-deleted)
const getTicketsByUserId = async (req, res) => {
  try {
    let tickets = await ticketModel.find(
      { createdBy: req.headers.userId, isDelete: false },
      { _id: 1, title: 1, imageUrl: 1, createdAt: 1, status: 1, reason: 1 }
    ).sort({ createdAt: 1 });

    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => t.status === Status.RESOLVED).length;
    const pendingTickets = tickets.filter(t => t.status === Status.PENDING).length;
    const approvedTickets = tickets.filter(t => t.status === Status.APPROVED).length;

    res.status(200).send({
      message: "Tickets Fetched Successfully",
      tickets,
      totalTickets,
      resolvedTickets,
      pendingTickets,
      approvedTickets
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Update Ticket Status (only if not deleted)
const updateTicketStatus = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const status = req.params.status;
    if (ticketId && status) {
      const { reason } = req.body;
      let ticket = await ticketModel.findOne({ _id: ticketId, isDelete: false });
      if (!ticket) {
        return res.status(404).send({ message: "Ticket not found" });
      }

      if (status === Status.APPROVED) {
        ticket.status = Status.APPROVED;
        ticket.approvedBy = req.headers.userId;
        ticket.reason = `You can join a Google Meet to discuss further:https://meet.google.com/nxj-bwwb-mwp`;
      } else if (status === Status.RESOLVED) {
        ticket.status = Status.RESOLVED;
        ticket.rejectedBy = req.headers.userId;
        ticket.reason = reason;
      } else {
        ticket.status = Status.PENDING;
        ticket.reason = "Your ticket is in progress. We'll update you soon.";
      }
      ticket.modifiedAt = Date.now();
      await ticket.save();

      res.status(200).send({
        message: "Ticket Status Updated Successfully"
      });
    } else {
      res.status(400).send({ message: "Ticket Id Not found" });
    }

  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Edit Ticket (only if not deleted)
const editTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    if (ticketId) {
      let ticket = await ticketModel.findOne({ _id: ticketId, isDelete: false });
      if (!ticket) {
        return res.status(404).send({ message: "Ticket not found" });
      }

      const { title, imageUrl, description } = req.body;
      ticket.title = title;
      ticket.imageUrl = imageUrl;
      ticket.description = description;
      ticket.status = Status.PENDING;
      ticket.modifiedAt = Date.now();

      await ticket.save();

      res.status(200).send({
        message: "Ticket Edited Successfully"
      });
    } else {
      res.status(400).send({ message: "Ticket Id Not found" });
    }
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Soft Delete Ticket
const deleteTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    if (!ticketId) {
      return res.status(400).send({ message: "Ticket Id is required" });
    }

    let ticket = await ticketModel.findById(ticketId);
    if (!ticket || ticket.isDelete) {
      return res.status(404).send({ message: "Ticket not found" });
    }

    ticket.isDelete = true;
    ticket.isActive = false;
    ticket.modifiedAt = Date.now();
    await ticket.save();

    res.status(200).send({ message: "Ticket deleted successfully (soft delete)" });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

export default {
  createTicket,
  getAllTickets,
  getTicketById,
  getTicketsByUserId,
  updateTicketStatus,
  editTicket,
  getAllPendingTickets,
  deleteTicket
};
