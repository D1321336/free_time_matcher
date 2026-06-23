import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('events route');
});

// 新增個人行程
router.post('/add', (req, res) => {
    const { user_id, day_of_week, period, event_name } = req.body;

    if (!user_id || !day_of_week || !period || !event_name) {
        return res.json({
            success: false,
            message: "請完整填寫行程資料"
        });
    }

    db.run(
        `
        INSERT INTO personal_events
        (user_id, day_of_week, period, event_name)
        VALUES (?, ?, ?, ?)
        `,
        [user_id, day_of_week, period, event_name],
        function(err) {
            if (err) {
                return res.json({
                    success: false,
                    message: "新增行程失敗"
                });
            }

            res.json({
                success: true,
                message: "新增行程成功",
                eventId: this.lastID
            });
        }
    );
});

// 取得使用者個人行程
router.get('/:userId', (req, res) => {
    const { userId } = req.params;

    db.all(
        "SELECT * FROM personal_events WHERE user_id = ? AND status = 'active'",
        [userId],
        (err, events) => {
            if (err) {
                return res.json({
                    success: false,
                    message: "資料庫錯誤"
                });
            }

            res.json({
                success: true,
                events: events
            });
        }
    );
});

// 刪除個人行程
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    db.run(
        "DELETE FROM personal_events WHERE id = ?",
        [id],
        function (err) {
            if (err) {
                return res.json({
                    success: false,
                    message: "刪除失敗"
                });
            }

            if (this.changes === 0) {
                return res.json({
                    success: false,
                    message: "找不到行程"
                });
            }

            res.json({
                success: true,
                message: "行程刪除成功"
            });
        }
    );
});

export default router;