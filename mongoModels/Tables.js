import mongoose from "mongoose"
import dbConnection from "../config/connectDB.js"

const TableSchema = new mongoose.Schema(
    {
        _id: String,
    },
    { timestamps: true }
);
const TableModal = dbConnection.model('tables', TableSchema);

export default TableModal
