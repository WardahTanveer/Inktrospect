//Importing modules and setting up basic stuff
const express=require("express");
const app=express();
app.use(express.json());
app.use(express.static(__dirname));

const path=require("path");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "ejs"));

const bcrypt=require('bcryptjs');
const session=require('express-session');
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

const mysql=require('mysql2');
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "12345",
    database: "Inktrospect",
});

app.use((req,res,next)=>{
    res.locals.userLoggedIn=req.session.user?true:false;
    res.locals.username=req.session.user?.UserID || null;
    next();
});

//Register, login and logout
app.post("/register", async (req,res)=>{
    const {username, email, password}=req.body;
    db.query("select * from Users_Table where UserID=?", [username], async (err,result)=>{
        if(err){
            return res.status(500).json({ success: false, message: "Database error"});
        }
        if (result.length>0) {
            return res.status(400).json({ success: false, message: "Username already exists."});
        }
        const hashedPassword=await bcrypt.hash(password, 10);
        db.query("insert into Users_Table (UserID, Email, Password) values (?, ?, ?)", [username, email, hashedPassword], (err)=>{
            if(err){
                return res.status(500).json({ success: false, message: "Database error"});
            }
            res.status(200).json({success: true, message: "User registered successfully"})
        });
    });
});
app.post("/login", (req, res) => {
    const {username, password} = req.body;
    db.query("select * from Users_Table where UserID=?", [username], (err, result) => {
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
    db.query('select * from Tasks_Table where UserID = ?', [userID], (err, tasks) => {
        if (err) {
            return res.status(500).send('Error fetching tasks');
        }
        res.status(200).json({ success: true, tasks: tasks });
    });
});
app.post("/api/toDoList", (req, res) => {
    const userID = req.session.user.UserID;
    const { task, status } = req.body;
    db.query('insert into Tasks_Table (UserID, Task, Status) values (?, ?, ?)', [userID, task, status], (err) => {
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
        db.query('update Tasks_Table set Status = ? where TaskID = ? and UserID = ?', [status, taskID, userID], (err) => {
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
    db.query('delete from Tasks_Table where TaskID = ? and UserID = ?', [taskID, userID], (err) => {
        if (err) {
            return res.status(500).send('Error deleting task');
        }
        res.status(200).json({ success: true, message: "Task deleted" });
    });
});

//Notes
app.get("/api/notes", (req,res)=>{
    const userID = req.session.user.UserID;
    db.query('select * from Notes_Table where UserID = ?', [userID], (err, notes) => {
        if (err) {
            return res.status(500).send('Error fetching tasks');
        }
        res.status(200).json({ success: true, notes: notes });
    });
});
app.post("/api/notes", (req, res) => {
    const userID = req.session.user.UserID;
    const { title, content } = req.body;
    db.query('insert into Notes_Table (UserID, Title, Content) values (?, ?, ?)', [userID, title, content], (err) => {
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
    db.query('update Notes_Table set Title = ?, Content = ? where NoteID = ? and UserID = ?', [title, content, noteID, userID], (err) => {
        if (err){
            return res.status(500).send('Error updating note');
        }
        res.status(200).json({ success: true, message: "Note updated" });
    });
});
app.delete('/api/notes/:noteID', (req, res) => {
    const userID = req.session.user.UserID;
    const { noteID } = req.params;
    db.query('delete from Notes_Table where NoteID = ? and UserID = ?', [noteID, userID], (err) => {
        if (err) {
            return res.status(500).send('Error deleting note');
        }
        res.status(200).json({ success: true, message: "Note deleted" });
    });
});

//Mood Tracker
app.get("/api/mood", (req, res) => {
    const userID = req.session.user.UserID;
    db.query("select * from Mood_Table where UserID = ?", [userID], (err, moods) => {
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
    db.query("select * from Mood_Table where UserID = ? and Date = ?", [userID, date], (err, result) => {
        if (err) {
            return res.status(500).send("Error checking mood entry");
        }
        if (result.length > 0) {
            return res.status(400).json({ success: false, message: "You have already logged your mood for today" });
        }
        db.query("insert into Mood_Table (UserID, Mood, Date) values (?, ?, ?)", 
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
        "insert into Contact_Messages_Table (FullName, Email, Message) values (?, ?, ?)",
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
app.listen(5000, ()=>{
    console.log("Server is listening on port 5000...");
});