import mongoose from "./index.js";

const userSchema = new mongoose.Schema({
    password:{
        type:String,
        required:[true,"Password is required"]
    },

    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    status: {
        type: String,
        required:[true,"Status is Required"],
        enum: ['Active' , 'InActive'],
        default: 'Active',
    },

    role:{ type:String, default:'user' },

    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: Number, required: true },
    add: { type: String, required: true },
    desc: { type: String, required: true },

    datecreated: Date,
    dateUpdated: Date,

    // New fields
    isDelete: { type: Boolean, default: false },
    inActive: { type: Boolean, default: true }

},{ 
    collection:'users',
    versionKey:false,
    timestamps:true
});

const userModel = mongoose.model('users',userSchema);
export default userModel;
