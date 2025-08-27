import Task from "../models/task.js";
import  user from '../models/user.js' 
import mongoose from "../models/index.js";


import LeadUpdate from '../models/LeadUpdate.js';

// Create new task/lead
const createTask = async (req, res) => {
  try {
    const respdata = req.body;
    console.log("Request body:", JSON.stringify(respdata));
    respdata.createdBy = req.headers.userId;

    // If assignedTo is empty string, remove it
    if (!respdata.assignedTo || respdata.assignedTo === "") {
      delete respdata.assignedTo;
    }

    const task = await Task.create(respdata);

    // Create initial lead update
    await LeadUpdate.create({
      taskId: task._id,
      updatedBy: req.headers.userId,
      updateType: "status_change",
      oldStatus: null,
      newStatus: "Pending",
      notes: "Lead created",
    });

    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


// Bulk create tasks
const bulkCreate = async (req, res) => {
  try {
    const { tasks } = req.body;
    console.log("Received tasks for bulk creation:", JSON.stringify(tasks));

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ message: "Tasks array is required" });
    }

    const tasksWithDefaults = tasks.map(task => {
      const taskData = {
        name: task.name,
        email: task.email,
        mobile: task.mobile,
        title: task.title,
        description: task.description,
        createdBy: req.headers.userId,
        frontendUrl: task.frontendUrl || '',
        backendUrl: task.backendUrl || '',
        isDelete: false,   // ✅ schema default
        inActive: true     // ✅ schema default
      };

      // ✅ only include assignedTo if it's valid (not empty string/null)
      if (task.assignedTo && task.assignedTo !== "") {
        taskData.assignedTo = task.assignedTo;
      }

      return taskData;
    });

    // Insert tasks
    const result = await Task.insertMany(tasksWithDefaults);

    // Create lead updates for each created task
    const leadUpdates = result.map(task => ({
      taskId: task._id,
      updatedBy: req.headers.userId,
      updateType: "status_change",
      oldStatus: null,
      newStatus: "Pending",
      notes: "Lead created via bulk import"
    }));

    await LeadUpdate.insertMany(leadUpdates);

    res.status(201).json({
      message: `Successfully created ${result.length} tasks`,
      tasks: result
    });
  } catch (error) {
    console.error("Bulk create error:", error.message);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};



// Add lead update
const addLeadUpdate = async (req, res) => {
  try {
    const { taskId, updateType, notes, newStatus, nextFollowUp, priority } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const leadUpdate = await LeadUpdate.create({
      taskId,
      updatedBy: req.headers.userId,
      updateType,
      oldStatus: task.status,
      newStatus: newStatus || task.status,
      notes,
      nextFollowUp,
      priority: priority || 'medium'
    });

    // Update task status if new status provided
    if (newStatus) {
      task.status = newStatus;
      task.updatedAt = new Date();
      await task.save();
    }

    res.status(201).json({ message: 'Lead update added successfully', leadUpdate });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};
// Get all tasks with lead updates (Admin view)
const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ isDelete: false })   // ✅ only non-deleted
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ tasks });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Get user's assigned tasks
const getUserTasks = async (req, res) => {
  try {
    const userId = req.headers.userId;
    const tasks = await Task.find({ assignedTo: userId, isDelete: false }) // ✅
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ tasks });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Get lead updates for a specific task
const getTaskUpdates = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = await LeadUpdate.find({ taskId, isDelete: false }) // ✅
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ updates });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Update task details
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    const task = await Task.findByIdAndUpdate(
      taskId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json({ message: 'Task updated successfully', task });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};


// const createTask = async (req, res) => {
//   try {
//     const { title, description } = req.body;

//     // Create the task without assignedTo
//     const task = await Task.create({
//       title,
//       description,
//       createdBy: req.headers.userId,
//     });

//     res.status(201).json({ message: 'Task created successfully', task });
//   } catch (error) {
//     res.status(500).json({ message: 'Internal Server Error', error: error.message });
//   }
// };


//   // In your backend route handler (e.g., /routes/task.js)
// const bulkCreate = async (req, res) => {
//   try {
//     console.log("Bulk create endpoint hit");
//     const { tasks } = req.body;
//     console.log("Received tasks for bulk creation:", tasks);
    
//     if (!tasks || !Array.isArray(tasks)) {
//       return res.status(400).json({ message: "Tasks array is required" });
//     }
    
//     // Validate each task - only check title and description
//     for (const task of tasks) {
//       if (!task.title || !task.description) {
//         return res.status(400).json({ 
//           message: "Each task must have title and description fields" 
//         });
//       }
//     }
    
//     // Prepare tasks with createdBy field (using headers.userId like your single create)
//     const tasksWithCreator = tasks.map(task => ({
//       title: task.title,
//       description: task.description,
//       createdBy: req.headers.userId // Using headers.userId like your single create
//     }));
    
//     // Insert all tasks
//     const result = await Task.insertMany(tasksWithCreator);
    
//     res.status(201).json({ 
//       message: `Successfully created ${result.length} tasks`,
//       tasks: result
//     });
//   } catch (error) {
//     console.error("Error creating tasks in bulk:", error);
//     res.status(500).json({ message: "Internal server error", error: error.message });
//   }
// };


const getTaskById = async (req, res) => {
    try {
      const assignedTo = req.headers.userId;
  
      // Check if the user ID is valid
      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
  
      // Find tasks assigned to the specified user
      const tasks = await Task.find({  assignedTo: assignedTo, isDelete: false  });
  
      if (tasks.length === 0) {
        return res.status(404).json({ message: 'No tasks found for the specified user' });
      }
  
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  };
  
const getTaskbyTaskId = async (req, res) => {
  try {
    const taskId = req.params.taskId;

    const task = await Task.findOne({ _id: taskId, isDelete: false }); // ✅

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

  
  const submitTask = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const { frontendUrl, backendUrl } = req.body;

        // Check if the task ID is valid
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: 'Invalid task ID' });
        }

        // Find the task with the specified ID
        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }



        // Check if the task is already submitted
        if (task.status === 'Submitted') {
            return res.status(400).json({ message: 'Task has already been submitted' });
        }

        // Update the task fields
        task.status = 'Submitted';
        task.frontendUrl = frontendUrl;
        task.backendUrl = backendUrl;

        await task.save();

        res.status(200).json({ message: 'Task submitted successfully', task });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};



// TaskController.js
const getTasksByStatus = async (req, res) => {
  try {
    const { status } = req.query;
    let query = { isDelete: false };  // ✅ only active ones

    if (status && status.toLowerCase() !== 'all') {
      query.status = status;
    }

    const tasks = await Task.find(query);
    if (tasks.length === 0) {
      return res.status(404).json({ message: `No tasks with status ${status || 'any'} found` });
    }

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

const getAllTask = async (req, res) => {
  try {
    const tasks = await Task.find({ isDelete: false }); // ✅

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'No tasks found' });
    }

    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter(task => task.status === 'Pending').length;
    const submittedTasks = tasks.filter(task => task.status === 'Submitted').length;

    res.status(200).json({
      totalTasks,
      pendingTasks,
      submittedTasks,
      tasks
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const task = await Task.findById(taskId);

    if (!task || task.isDelete) {
      return res.status(404).json({ message: 'Task not found or already deleted' });
    }

    // ✅ Soft delete
    task.isDelete = true;
    await task.save();

    res.status(200).json({ message: 'Task soft deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};



const editTask = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const { title, description, assignedTo } = req.body;

        // Check if the task ID is valid
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: 'Invalid task ID' });
        }

        // Find the task with the specified ID
        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Validate input
        if (!title || !description || !assignedTo) {
            return res.status(400).json({ message: 'These (title, description, assignedTo) must be provided for update' });
        }

        // Check if the assignedTo ID is valid
        if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
            return res.status(400).json({ message: 'Invalid assignedTo ID' });
        }

        // Update the task fields if provided
        if (title) {
            task.title = title;
        }
        if (description) {
            task.description = description;
        }
        if (assignedTo) {
            // Check if the assignedTo ID is valid
            const isValidAssignedTo = await user.findById(assignedTo);
            if (!isValidAssignedTo) {
                return res.status(400).json({ message: 'Invalid assignedTo ID' });
            }

            task.assignedTo = assignedTo;
        }

        await task.save();

        res.status(200).json({ message: 'Task updated successfully', task });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};


export default{
    createTask,
    bulkCreate,
    getTaskUpdates,
    addLeadUpdate,
    submitTask,
    getTaskById,
    getTaskbyTaskId,
    getTasksByStatus,
    getAllTask,
    deleteTask,
    editTask
}