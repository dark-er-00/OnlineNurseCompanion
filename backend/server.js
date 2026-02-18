const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

const cors = require("cors");
app.use(cors());

const path = require("path");

app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

mongoose.connect("mongodb+srv://dark-er-00:kitkat@onlinenursecompanion.yymi2nh.mongodb.net/online-nurse?retryWrites=true&w=majority")
.then(() => {
    console.log("MongoDB Connected");

    app.listen(3000, () => {
        console.log("Server running on port 3000");
    });
})
.catch(err => console.log("MongoDB Error:", err));

const caseSchema = new mongoose.Schema({
    dateTime: String,
    studentName: String,
    course: String,
    email: String,
    symptoms: String,
    duration: String,
    painLevel: Number,
    dangerFlag: Boolean,
    canAttendClass: Boolean,
    status: String,
    urgencyLevel: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compute Urgency Level based on pain level, danger flag, and ability to attend class
function computeUrgency({ painLevel, dangerFlag, canAttendClass }) {

    // Immediate urgent condition
    if (dangerFlag === true) {
        return "URGENT";
    }

    if (painLevel >= 8) {
        return "URGENT";
    }

    if (!canAttendClass && painLevel >= 5) {
        return "MEDIUM";
    }

    if (painLevel >= 5) {
        return "MEDIUM";
    }

    return "LOW";
}


const Case = mongoose.model("Case", caseSchema);

// Webhook endpoint for GHL sheet submissions
app.post("/webhook/ghl-sheet", async (req, res) => {
    try {

        const {
            dateTime,
            studentName,
            course,
            email,
            symptoms,
            duration,
            painLevel,
            dangerFlag,
            canAttendClass,
            status
        } = req.body;

        const urgencyLevel = computeUrgency({
            painLevel: Number(painLevel),
            dangerFlag: dangerFlag === "Yes",
            canAttendClass: canAttendClass === "Yes"
        });

        const newCase = new Case({
            dateTime,
            studentName,
            course,
            email,
            symptoms,
            duration,
            painLevel: Number(painLevel),
            dangerFlag: dangerFlag === "Yes",
            canAttendClass: canAttendClass === "Yes",
            status,
            urgencyLevel
        });

        await newCase.save();

        console.log(`✅ Case saved: ${studentName} | ${urgencyLevel}`);

        res.status(200).json({ message: "Case saved successfully" });

    } catch (error) {
        console.error("❌ Webhook error:", error);
        res.status(500).json({ error: "Failed to save case" });
    }
});

app.get("/nurse/cases", async (req, res) => {
    const casesForNurse = await Case.find();
    res.json(casesForNurse);
});


app.get("/health-questions", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/health-questions.html"));
});

app.get("/first-aid", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/first-aid.html"));
});

app.get("/mental", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/mental.html"));
});