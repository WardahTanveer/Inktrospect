const inputBox = document.getElementById("input-box");
const listContainer = document.getElementById("list-container");
const addButton = document.getElementById("add-button");

function loadTasks() {
    fetch('/api/toDoList')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayTasks(data.tasks);
            } else {
                console.error("Failed to load tasks:", data.message);
            }
        })
        .catch(error => {
            console.error("Error loading tasks:", error);
        });
}
function displayTasks(tasks) {
    listContainer.innerHTML = "";
    tasks.forEach(task => {
        let li = document.createElement("li");
        li.textContent = task.Task;
        li.dataset.id = task.TaskID;
        if (task.Status === "Checked") {
            li.classList.add("checked");
        }
        let deleteButton = document.createElement("span");
        deleteButton.innerHTML = "\u00d7";
        deleteButton.classList.add("delete-btn");
        li.appendChild(deleteButton);
        listContainer.appendChild(li);
    });
}
function addTask() {
    console.log("Adding task...");
    if (inputBox.value.trim() === '') {
        alert("You must write something!");
        return;
    }
    fetch('/api/toDoList', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            task: inputBox.value.trim(),
            status: "Unchecked",
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            inputBox.value = "";
            loadTasks();
        } else {
            alert("Error adding task: " + data.message);
        }
    })
    .catch(error => {
        console.error('Error adding task:', error);
    });
}
function updateTaskStatus(taskId, newStatus, liElement) {
    fetch(`/api/toDoList/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (newStatus === "Checked") {
                liElement.classList.add("checked");
            } else {
                liElement.classList.remove("checked");
            }
        } else {
            alert("Error updating task status: " + data.message);
        }
    })
    .catch(error => {
        console.error("Error updating task status:", error);
    });
}
function deleteTask(taskId) {
    fetch(`/api/toDoList/${taskId}`, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadTasks();
        } else {
            alert("Error deleting task: " + data.message);
        }
    })
    .catch(error => {
        console.error("Error deleting task:", error);
    });
}

document.addEventListener('DOMContentLoaded', loadTasks);
if (addButton) {
    addButton.addEventListener('click', addTask);
}
listContainer.addEventListener("click", function (e) {
    const li = e.target.closest('li');
    if (!li) {
        return;
    }
    const taskId = li.dataset.id;
    if (!e.target.classList.contains("delete-btn")) {
        const newStatus = li.classList.contains("checked") ? "Unchecked" : "Checked";
        updateTaskStatus(taskId, newStatus, li);
    }
    else if (e.target.classList.contains("delete-btn")) {
        deleteTask(taskId);
    }
});
