const mongoose = require("mongoose");

function dbConnection() {
    mongoose.connect(process.env.MONGODB_URL).then(()=>{
             console.log("Database connected");
        })
        .catch(err => {
             console.error("Database connection error", err);
        });
}

module.exports = dbConnection;