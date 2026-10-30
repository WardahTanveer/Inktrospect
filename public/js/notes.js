const createBtn = document.querySelector(".create-btn");
const notesContainer = document.querySelector(".notes-container");

function loadNotes() {
    fetch('/api/notes')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayNotes(data.notes);
            } else {
                console.error("Failed to load notes:", data.message);
            }
        })
        .catch(error => {
            console.error("Error loading notes:", error);
        });
}
function displayNotes(notes) {
    notesContainer.innerHTML = "";
    notes.forEach(note => {
        let notebox = document.createElement("div");
        notebox.classList.add("note-box");

        let noteTitle = document.createElement("div");
        noteTitle.classList.add("note-title");
        noteTitle.setAttribute("contenteditable", "true");
        noteTitle.innerText = note.Title || "";
        noteTitle.addEventListener("blur", () => {
            updateNote(note.NoteID, noteTitle.innerText, noteContent.innerText);
        });
        notebox.appendChild(noteTitle);

        let noteContent = document.createElement("div");
        noteContent.classList.add("note-content");
        noteContent.setAttribute("contenteditable", "true");
        noteContent.innerText = note.Content || "";
        noteContent.addEventListener("blur", () => {
            updateNote(note.NoteID, noteTitle.innerText, noteContent.innerText);
        });
        notebox.appendChild(noteContent);

        let noteDate = document.createElement("div");
        noteDate.classList.add("note-date");
        noteDate.innerText = note.Date ? new Date(note.Date).toLocaleString() : new Date().toLocaleString();
        notebox.appendChild(noteDate);

        let deleteImg = document.createElement("img");
        deleteImg.src = "/assets/notesdelete.png";
        deleteImg.classList.add("delete-btn");
        deleteImg.onclick = ()=>{
            deleteNote(note.NoteID);
        }
        notebox.appendChild(deleteImg);

        notesContainer.appendChild(notebox);
    });
}
function createNote() {
    const defaultTitle = "Untitled";
    const defaultContent = "Start typing here...";

    fetch('/api/notes', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: defaultTitle,
            content: defaultContent
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                loadNotes();
            } else {
                alert("Failed to create note.");
            }
        })
        .catch(err => {
            console.error("Error creating note:", err);
        });
}
function updateNote(noteID, title, content){
    fetch(`/api/notes/${noteID}`, {
        method: 'PUT',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ title, content })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            console.error("Failed to update note:", data.message);
        }
    })
    .catch(err => {
        console.error("Error updating note:", err);
    });
}
function deleteNote(noteID) {
    fetch(`/api/notes/${noteID}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            loadNotes();
        } else {
            alert("Failed to delete note.");
        }
    });
}

document.addEventListener('DOMContentLoaded', loadNotes);
if(createBtn){
    createBtn.addEventListener("click", createNote);
}
