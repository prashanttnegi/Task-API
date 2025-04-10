// controllers/taskController.js
const Task = require('../models/Task');
const User = require('../models/User');

// Create a task
exports.createTask = async (req, res) => {
    try {
        const task = await Task.create({
        ...req.body,
        createdBy: req.user._id
        });
        res.status(201).json(task);
    } catch (err) {
        res.status(400).json({ message: 'Failed to create task', error: err.message });
    }
};

// Get tasks (based on role)
exports.getTasks = async (req, res) => {
    try {
        let query = {};

        if (req.user.role === 'user') {
        query = { createdBy: req.user._id };
        } else if (req.user.role === 'manager') {
        // Manager sees tasks created by their team
        const teamUsers = await User.find({ team: req.user.team }).select('_id');
        query = { createdBy: { $in: teamUsers.map(u => u._id) } };
        }

        const tasks = await Task.find(query).populate('createdBy assignedTo', 'username email');
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch tasks', error: err.message });
    }
};

// Update a task
exports.updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Only creator, assignee, or admin can update
        if (
        !task.createdBy.equals(req.user._id) &&
        !(task.assignedTo && task.assignedTo.equals(req.user._id)) &&
        req.user.role !== 'admin'
        ) {
        return res.status(403).json({ message: 'You cannot update this task' });
        }

        Object.assign(task, req.body);
        await task.save();
        res.json(task);
    } catch (err) {
        res.status(400).json({ message: 'Update failed', error: err.message });
    }
};

// Delete a task
exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        if (!task.createdBy.equals(req.user._id) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'You cannot delete this task' });
        }

        await task.deleteOne();
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed', error: err.message });
    }
};

// Assign task (Manager/Admin only)
exports.assignTask = async (req, res) => {
    const { userId } = req.body;

    try {
        const task = await Task.findById(req.params.id);
        const user = await User.findById(userId);

        if (!task || !user) return res.status(404).json({ message: 'Task or User not found' });

        if (req.user.role === 'manager' && user.team !== req.user.team) {
        return res.status(403).json({ message: 'Managers can only assign tasks within their team' });
        }

        task.assignedTo = userId;
        await task.save();
        res.json(task);
    } catch (err) {
        res.status(400).json({ message: 'Assignment failed', error: err.message });
    }
};


// GET /api/tasks/analytics
exports.getAnalytics = async (req, res) => {
    try {
        const match = {};
        if (req.user.role === 'user') {
            match.createdBy = req.user._id;
        } else if (req.user.role === 'manager') {
            const teamUsers = await User.find({ team: req.user.team }).select('_id');
            match.createdBy = { $in: teamUsers.map(u => u._id) };
        }
  
        const stats = await Task.aggregate([
            { $match: match },
            {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
            }
        ]);
    
        const formatted = stats.reduce((acc, cur) => {
            acc[cur._id] = cur.count;
            return acc;
        }, {});
    
        res.json({
            completed: formatted['completed'] || 0,
            pending: formatted['pending'] || 0,
            inProgress: formatted['in-progress'] || 0,
            overdue: formatted['overdue'] || 0
        });
    } catch (err) {
        res.status(500).json({ message: 'Analytics error', error: err.message });
    }
};
  