import db from '../db.js';
import express from 'express';
const router = express.Router();


/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// 使用者註冊
// 使用者註冊
router.post('/register', (req, res) => {
  const { name, student_id, password } = req.body;

  if (!name || !student_id || !password) {
    return res.json({
      success: false,
      message: "請完整填寫資料"
    });
  }

  db.get(
    "SELECT * FROM users WHERE student_id = ?",
    [student_id],
    (err, user) => {
      if (err) {
        return res.json({
          success: false,
          message: "資料庫錯誤"
        });
      }

      if (user) {
        return res.json({
          success: false,
          message: "學號已註冊"
        });
      }

      db.run(
        "INSERT INTO users (name, student_id, password) VALUES (?, ?, ?)",
        [name, student_id, password],
        function(err) {
          if (err) {
            return res.json({
              success: false,
              message: "註冊失敗"
            });
          }

          res.json({
            success: true,
            message: "註冊成功，請重新登入",
            userId: this.lastID
          });
        }
      );
    }
  );
});

// 使用者登入
router.post('/login', (req, res) => {
  const { student_id, password } = req.body;

  if (!student_id || !password) {
    return res.json({
      success: false,
      message: "請輸入學號與密碼"
    });
  }

  db.get(
    "SELECT * FROM users WHERE student_id = ?",
    [student_id],
    (err, user) => {
      if (err) {
        return res.json({
          success: false,
          message: "資料庫錯誤"
        });
      }

      if (!user) {
        return res.json({
          success: false,
          message: "帳號不存在"
        });
      }

      if (user.password !== password) {
        return res.json({
          success: false,
          message: "密碼錯誤"
        });
      }

      res.json({
        success: true,
        message: "登入成功",
        user: {
          id: user.id,
          name: user.name,
          student_id: user.student_id
        }
      });
    }
  );
});

export default router;
