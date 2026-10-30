require('dotenv').config();

//Importing modules and setting up basic stuff
const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "ejs"));

const bcrypt=require('bcryptjs');
const session=require('express-session');
const MySQLStore = require('express-mysql-session')(session);
app.set('trust proxy', 1);
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    ssl: process.env.DB_SSL === 'true'
        ? { ca: process.env.DB_SSL_CA }
        : undefined,

    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0
});
sessionStore.onReady()
    .then(() => console.log('MySQL session store ready.'))
    .catch(err => console.error('Session store error:', err));
app.use(session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

const mysql=require('mysql2');
const db=mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true'
        ? { ca: process.env.DB_SSL_CA }
        : undefined,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL successfully!');
        connection.release();
    }
});

app.use((req,res,next)=>{
    res.locals.userLoggedIn=req.session.user?true:false;
    res.locals.username=req.session.user?.UserID || null;
    next();
});

//Register, login and logout
app.post("/register", async (req,res)=>{
    const {username, email, password}=req.body;
    db.query("select * from users_table where UserID=?", [username], async (err,result)=>{
        if(err){
            return res.status(500).json({ success: false, message: "Database error"});
        }
        if (result.length>0) {
            return res.status(400).json({ success: false, message: "Username already exists."});
        }
        const hashedPassword=await bcrypt.hash(password, 10);
        db.query("insert into users_table (UserID, Email, Password) values (?, ?, ?)", [username, email, hashedPassword], (err)=>{
            if(err){
                return res.status(500).json({ success: false, message: "Database error"});
            }
            res.status(200).json({success: true, message: "User registered successfully"})
        });
    });
});
app.post("/login", (req, res) => {
    const {username, password} = req.body;
    db.query("select * from users_table where UserID=?", [username], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error"});
        }
        if (result.length === 0) {
            return res.status(400).json({ success: false, message: "User not found"});
        }
        const user = result[0];
        bcrypt.compare(password, user.Password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Error comparing password"});
            }
            if (isMatch) {
                req.session.user = user;
                return res.json({ success: true, message: "Login successful"});
            } else {
                return res.status(400).json({ success: false, message: "Incorrect password"});
            }
        });
    });
});
app.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: "Logout failed." });
        }
        res.clearCookie("connect.sid");
        res.json({ success: true, redirectUrl: "/" });
    });
});

//Page routes (aka GET requests)
app.get("/", (req,res)=>{
    res.render("home");
});
app.get("/aboutUs", (req,res)=>{
    res.render("aboutus");
});
app.get("/contactUs", (req,res)=>{
    res.render("contactus");
});
app.get("/moodTracker", (req,res)=>{
    res.render("mood");
});
app.get("/notes", (req,res)=>{
    res.render("notes");
});
app.get("/toDoList", (req,res)=>{
    res.render("todo");
});

//CRUD with database (aka GET, POST, PUT, DELETE requests)
//To-Do List
app.use("/api", (req,res,next)=>{
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "You must be logged in to perform this action." });
    }
    next();
});
app.get("/api/toDoList", (req, res) => {
    const userID = req.session.user.UserID;
    db.query('select * from tasks_table where UserID = ?', [userID], (err, tasks) => {
        if (err) {
            return res.status(500).send('Error fetching tasks');
        }
        res.status(200).json({ success: true, tasks: tasks });
    });
});
app.post("/api/toDoList", (req, res) => {
    const userID = req.session.user.UserID;
    const { task, status } = req.body;
    db.query('insert into tasks_table (UserID, Task, Status) values (?, ?, ?)', [userID, task, status], (err) => {
        if (err) {
            return res.status(500).send('Error adding task');
        }
        res.status(200).json({ success: true, message: "Task added" });
    });
});
app.put("/api/toDoList/:taskID", (req, res) => {
    const userID = req.session.user.UserID;
    const { taskID } = req.params;
    const { status } = req.body;
    if (status !== undefined) {
        db.query('update tasks_table set Status = ? where TaskID = ? and UserID = ?', [status, taskID, userID], (err) => {
            if (err){
                return res.status(500).send('Error updating status');
            }
            res.status(200).json({ success: true, message: "Task updated" });
        });
    } 
    else {
        res.status(400).json({ success: false, message: "No new status provided for task update." });
    }
});
app.delete('/api/toDoList/:taskID', (req, res) => {
    const userID = req.session.user.UserID;
    const { taskID } = req.params;
    db.query('delete from tasks_table where TaskID = ? and UserID = ?', [taskID, userID], (err) => {
        if (err) {
            return res.status(500).send('Error deleting task');
        }
        res.status(200).json({ success: true, message: "Task deleted" });
    });
});

//Notes
app.get("/api/notes", (req,res)=>{
    const userID = req.session.user.UserID;
    db.query('select * from notes_table where UserID = ?', [userID], (err, notes) => {
        if (err) {
            return res.status(500).send('Error fetching tasks');
        }
        res.status(200).json({ success: true, notes: notes });
    });
});
app.post("/api/notes", (req, res) => {
    const userID = req.session.user.UserID;
    const { title, content } = req.body;
    db.query('insert into notes_table (UserID, Title, Content) values (?, ?, ?)', [userID, title, content], (err) => {
        if (err) {
            return res.status(500).send('Error adding note');
        }
        res.status(200).json({ success: true, message: "Note added" });
    });
});
app.put("/api/notes/:noteID", (req, res) => {
    const userID = req.session.user.UserID;
    const { noteID } = req.params;
    const { title, content } = req.body;
    db.query('update notes_table set Title = ?, Content = ? where NoteID = ? and UserID = ?', [title, content, noteID, userID], (err) => {
        if (err){
            return res.status(500).send('Error updating note');
        }
        res.status(200).json({ success: true, message: "Note updated" });
    });
});
app.delete('/api/notes/:noteID', (req, res) => {
    const userID = req.session.user.UserID;
    const { noteID } = req.params;
    db.query('delete from notes_table where NoteID = ? and UserID = ?', [noteID, userID], (err) => {
        if (err) {
            return res.status(500).send('Error deleting note');
        }
        res.status(200).json({ success: true, message: "Note deleted" });
    });
});

//Mood Tracker
app.get("/api/mood", (req, res) => {
    const userID = req.session.user.UserID;
    db.query("select * from mood_table where UserID = ?", [userID], (err, moods) => {
        if (err){
            return res.status(500).send("Error fetching mood entries");
        }
        res.status(200).json({ success: true, moods: moods });
    });
});
app.post("/api/mood", (req, res) => {
    const userID = req.session.user.UserID;
    const { mood } = req.body;
    const date = new Date().toISOString().split('T')[0];
    db.query("select * from mood_table where UserID = ? and Date = ?", [userID, date], (err, result) => {
        if (err) {
            return res.status(500).send("Error checking mood entry");
        }
        if (result.length > 0) {
            return res.status(400).json({ success: false, message: "You have already logged your mood for today" });
        }
        db.query("insert into mood_table (UserID, Mood, Date) values (?, ?, ?)", 
            [userID, mood, date], 
            (err) => {
                if (err){
                    return res.status(500).send("Error adding mood entry");
                }
                res.status(200).json({ success: true, message: "Mood entry added" });
            }
        );
    });
});

//Contact Us
app.post("/submitContactForm", (req, res) => {
    const { fullName, email, message } = req.body;
    db.query(
        "insert into contact_messages_table (FullName, Email, Message) values (?, ?, ?)",
        [fullName, email, message],
        (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database error" });
            }
            res.status(200).json({ success: true, message: "Message sent successfully" });
        }
    );
})

// Remaining cases
app.all("*", (req,res)=>{
    res.status(404).send("Resource not found.");
});

//Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}...`);
});