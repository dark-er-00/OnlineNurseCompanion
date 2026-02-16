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

app.get("/symptom", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/symptom.html"));
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
    name: String,
    painLevel: Number,
    hasFever: Boolean,
    durationDays: Number,
    dangerSigns: Boolean,
    selfHarmThoughts: Boolean,
    mentalScore: Number,

    urgencyLevel: String,

    consentGiven: {
        type: Boolean,
        default: false
    },

    status: {
        type: String,
        default: "AWAITING CONSENT"
    },

    nurseNotes: {
        type: String,
        default: null
    },

    timestamp: {
        type: Date,
        default: Date.now
    }
});


const Case = mongoose.model("Case", caseSchema);

function computeUrgency(data) {

    let score = 0;

    // Physical scoring
    score += data.painLevel;

        if (data.selfHarmThoughts) {
        return "URGENT";
    }

    if (data.hasFever) score += 2;

    if (data.durationDays >= 3) score += 2;

    if (data.dangerSigns) score += 10;

    // Mental scoring
    score += data.mentalScore;

    // Determine level
    if (data.dangerSigns || score >= 15) {
        return "URGENT";
    }

    if (score >= 8) {
        return "MEDIUM";
    }

    return "LOW";
}

function generateGuidance(urgencyLevel) {

    if (urgencyLevel === "LOW") {
        return {
            whatToDo: "Rest, hydrate, and monitor symptoms.",
            whatToMonitor: "Fever, worsening pain, new symptoms.",
            whenToSeekHelp: "If symptoms worsen or last more than 3 days.",
            restrictions: "Avoid heavy physical activity."
        };
    }

    if (urgencyLevel === "MEDIUM") {
        return {
            whatToDo: "Schedule a visit with the school nurse.",
            whatToMonitor: "Increasing pain, high fever, dizziness.",
            whenToSeekHelp: "Visit clinic within 24–48 hours.",
            restrictions: "Avoid strenuous activities."
        };
    }

    return {
        whatToDo: "Seek immediate medical attention.",
        whatToMonitor: "Breathing difficulty, chest pain, fainting.",
        whenToSeekHelp: "Go to clinic immediately.",
        restrictions: "Do not ignore symptoms."
    };
}


app.post("/student/self-check", async (req, res) => {

    const {
        name,
        painLevel,
        hasFever,
        durationDays,
        dangerSigns,
        mentalScore,
        selfHarmThoughts
    } = req.body;

    const urgencyLevel = computeUrgency({
        painLevel,
        hasFever,
        durationDays,
        dangerSigns,
        mentalScore,
        selfHarmThoughts
    });

    const newCase = new Case({
        name,
        painLevel,
        hasFever,
        durationDays,
        dangerSigns,
        selfHarmThoughts,
        mentalScore,
        urgencyLevel,
        consentGiven: false,
        status: urgencyLevel === "URGENT" ? "AUTO-SENT TO NURSE" : "AWAITING CONSENT"
    });


    await newCase.save();

    const guidance = generateGuidance(urgencyLevel);

    res.json({
        caseId: newCase._id,
        urgencyLevel,
        guidance
    });
});

app.put("/student/consent/:id", async (req, res) => {

    const { consent } = req.body;

    const updatedCase = await Case.findByIdAndUpdate(
        req.params.id,
        {
            consentGiven: consent,
            status: consent ? "SENT TO NURSE" : "CLOSED BY STUDENT"
        },
        { new: true }
    );

    res.json(updatedCase);
});

app.put("/student/follow-up/:id", async (req, res) => {

    const { painLevel, mentalScore } = req.body;

    const updatedUrgency = computeUrgency({
        painLevel,
        hasFever: false,
        durationDays: 1,
        dangerSigns: false,
        mentalScore
    });

    const updatedCase = await Case.findByIdAndUpdate(
        req.params.id,
        { urgencyLevel: updatedUrgency },
        { new: true }
    );

    res.json(updatedCase);
});


app.put("/nurse/cases/:id", async (req, res) => {
    try {
        const { status, nurseNotes } = req.body;

        const updatedCase = await Case.findByIdAndUpdate(
            req.params.id,
            { status, nurseNotes },
            { new: true }
        );

        res.json(updatedCase);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update case" });
    }
});

app.get("/nurse/cases", async (req, res) => {
    const casesForNurse = await Case.find({
        $or: [
            { urgencyLevel: "URGENT" },
            { consentGiven: true }
        ]
    });

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