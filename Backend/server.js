const express = require("express");
const cors = require("cors");
require("dotenv").config({ quiet: true });

const userRoutes = require("./User/UserRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/user", userRoutes);

app.post("/", (req, res) => {
    res.send("Backend is running");
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
