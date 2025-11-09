const TASKS_KEY = 'tasks_v1';
let tasks = [];

function qs(id){ return document.getElementById(id); }

// Add this function to handle the new task input
function checkgetlist() {
    const textarea = qs('entry-checklist');
    if (!textarea) return;
    
    const lines = textarea.value.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
        alert('Please enter at least one task');
        return;
    }
    
    const newTasks = lines.map(line => ({
        id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8),
        text: line.trim(),
        completed: false,
        createdAt: Date.now()
    }));

    const existingTasks = loadTasks();
    const updatedTasks = [...existingTasks, ...newTasks];
    saveTasks(updatedTasks);
    
    // Clear input and refresh display
    textarea.value = '';
    renderTasks();
    
    alert(`Added ${newTasks.length} task(s) successfully`);
}

// Existing functions remain the same
function loadTasks() {
    try {
        const raw = localStorage.getItem(TASKS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.warn('Failed to load tasks', e);
        return [];
    }
}

function saveTasks(tasks) {
    try {
        localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch (e) {
        console.error('Failed to save tasks', e);
    }
}

function renderTasks() {
    const container = qs('tasks-list');
    if (!container) return;

    const tasks = loadTasks();
    const activeFilter = document.querySelector('.filter.active')?.dataset.filter || 'all';
    
    let filteredTasks = tasks;
    if (activeFilter === 'active') {
        filteredTasks = tasks.filter(t => !t.completed);
    } else if (activeFilter === 'completed') {
        filteredTasks = tasks.filter(t => t.completed);
    }

    container.innerHTML = filteredTasks.length === 0 
        ? '<div class="muted">No tasks</div>'
        : filteredTasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <input type="checkbox" id="task-${task.id}" 
                    ${task.completed ? 'checked' : ''}>
                <label for="task-${task.id}">${escapeHtml(task.text)}</label>
                <button class="delete-task danger">Delete</button>
            </div>
        `).join('');

    // Update counter
    const remaining = tasks.filter(t => !t.completed).length;
    if (qs('tasks-count')) {
        qs('tasks-count').textContent = `${remaining} task${remaining === 1 ? '' : 's'} remaining`;
    }
}
function toggleTask(id) {
    const tasks = loadTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks(tasks);
        renderTasks();
    }
}

function deleteTask(id) {
    const tasks = loadTasks();
    const newTasks = tasks.filter(t => t.id !== id);
    saveTasks(newTasks);
    renderTasks();
}

function clearCompleted() {
    const tasks = loadTasks();
    const newTasks = tasks.filter(t => !t.completed);
    saveTasks(newTasks);
    renderTasks();
}

function escapeHtml(s = '') {
    return String(s).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[m]);
}

// ... rest of your existing code ...

// Update the DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', () => {
    // Add event listener for the new task input button
    const addButton = qs('add-checklist-item');
    if (addButton) {
        addButton.onclick = checkgetlist;
    }

    // Filter buttons
    document.querySelectorAll('.filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTasks();
        });
    });

    // Task list interactions
    const tasksList = qs('tasks-list');
    if (tasksList) {
        tasksList.addEventListener('click', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;
            
            const id = taskItem.dataset.id;
            if (e.target.type === 'checkbox') {
                toggleTask(id);
            } else if (e.target.classList.contains('delete-task')) {
                deleteTask(id);
            }
        });
    }

    // Clear completed button
    const clearBtn = qs('clear-completed');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCompleted);
    }

    // Initial render
    renderTasks();
});