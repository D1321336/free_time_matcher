import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('groups route');
});

// 建立群組
router.post('/create', (req, res) => {
  const { group_name, owner_id } = req.body;

  if (!group_name || !owner_id) {
    return res.json({
      success: false,
      message: "請完整填寫資料"
    });
  }

  db.run(
    "INSERT INTO groups (group_name, owner_id) VALUES (?, ?)",
    [group_name, owner_id],
    function(err) {
      if (err) {
        return res.json({
          success: false,
          message: "建立群組失敗"
        });
      }

        const groupId = this.lastID;

        db.run(
        "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
        [groupId, owner_id],
        function(err) {
            if (err) {
            return res.json({
                success: false,
                message: "群組建立成功，但加入建立者失敗"
            });
            }

            res.json({
            success: true,
            message: "建立群組成功，建立者已加入群組",
            groupId: groupId
            });
        }
        );
    }
  );
});

// 加入群組
router.post('/add-member', (req, res) => {
  const { group_id, student_id } = req.body;

  if (!group_id || !student_id) {
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

      if (!user) {
        return res.json({
          success: false,
          message: "找不到該學生"
        });
      }

      db.get(
        "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
        [group_id, user.id],
        (err, groupMember) => {
          if (err) {
            return res.json({
              success: false,
              message: "資料庫錯誤"
            });
          }

          if (groupMember) {
            return res.json({
              success: false,
              message: "該學生已在群組中"
            });
          }

          db.run(
            "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
            [group_id, user.id],
            function(err) {
              if (err) {
                return res.json({
                  success: false,
                  message: "加入群組失敗"
                });
              }

              res.json({
                success: true,
                message: "加入群組成功"
              });
            }
          );
        }
      );
    }
  );
});

// 取得群組成員
router.get('/:groupId/members', (req, res) => {
  const { groupId } = req.params;

  db.all(
    `
    SELECT users.id, users.name, users.student_id
    FROM group_members
    JOIN users ON group_members.user_id = users.id
    WHERE group_members.group_id = ?
    `,
    [groupId],
    (err, members) => {
      if (err) {
        return res.json({
          success: false,
          message: "資料庫錯誤"
        });
      }

      res.json({
        success: true,
        members: members
      });
    }
  );
});
 

// 取得群組成員的空閒時間
router.get('/:groupId/free-time', (req, res) => {
  const { groupId } = req.params;

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  const isBusy = (busyTimes, day, period) => {
    return busyTimes.some(item =>
      item.day_of_week === day &&
      Number(item.period) === period
    );
  };

  db.all(
    "SELECT user_id FROM group_members WHERE group_id = ?",
    [groupId],
    (err, members) => {
      if (err) {
        return res.json({
          success: false,
          message: "資料庫錯誤"
        });
      }

      if (members.length === 0) {
        return res.json({
          success: false,
          message: "群組沒有成員"
        });
      }

      const userIds = members.map(member => member.user_id);
      const placeholders = userIds.map(() => "?").join(",");

      db.all(
        `SELECT user_id, day_of_week, period FROM courses WHERE user_id IN (${placeholders})`,
        userIds,
        (err, courses) => {
          if (err) {
            return res.json({
              success: false,
              message: "資料庫錯誤"
            });
          }

          db.all(
            `
            SELECT user_id, day_of_week, period
            FROM personal_events
            WHERE user_id IN (${placeholders})
            AND status = 'active'
            `,
            userIds,
            (err, events) => {
              if (err) {
                return res.json({
                  success: false,
                  message: "資料庫錯誤"
                });
              }

              db.all(
                `
                SELECT id, day_of_week, period, event_name
                FROM group_events
                WHERE group_id = ?
                `,
                [groupId],
                (err, groupEvents) => {
                  if (err) {
                    return res.json({
                      success: false,
                      message: "資料庫錯誤"
                    });
                  }

                  const busyTimes = [
                    ...courses,
                    ...events,
                    ...groupEvents
                  ];

                  const freeTimes = [];

                  for (const day of days) {
                    for (const period of periods) {
                      if (!isBusy(busyTimes, day, period)) {
                        freeTimes.push({
                          day: day,
                          period: period
                        });
                      }
                    }
                  }
                  res.json({
                    success: true,
                    freeTimes: freeTimes,
                    groupEvents: groupEvents
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// 取得使用者的群組列表
router.get('/:userId', (req, res) => {
    const { userId } = req.params;

    db.all(
        `
        SELECT groups.id, groups.group_name
        FROM group_members
        JOIN groups
        ON group_members.group_id = groups.id
        WHERE group_members.user_id = ?
        `,
        [userId],
        (err, groups) => {

            if (err) {
                return res.json({
                    success: false,
                    message: "資料庫錯誤"
                });
            }

            res.json({
                success: true,
                groups: groups
            });

        }
    );
});


// 新增共同行程
router.post('/events/add', (req, res) => {
  const { group_id, day_of_week, period, event_name } = req.body;

  if (!group_id || !day_of_week || !period || !event_name) {
    return res.json({
      success: false,
      message: "請完整填寫共同行程資料"
    });
  }

  db.run(
    `
    INSERT INTO group_events
    (group_id, day_of_week, period, event_name)
    VALUES (?, ?, ?, ?)
    `,
    [group_id, day_of_week, period, event_name],
    function(err) {
      if (err) {
        return res.json({
          success: false,
          message: "新增共同行程失敗"
        });
      }

      const groupEventId = this.lastID;

      db.all(
        "SELECT user_id FROM group_members WHERE group_id = ?",
        [group_id],
        (err, members) => {
          if (err) {
            return res.json({
              success: false,
              message: "共同行程建立成功，但取得群組成員失敗"
            });
          }

          if (members.length === 0) {
            return res.json({
              success: true,
              message: "新增共同行程成功，但群組沒有成員",
              groupEventId: groupEventId
            });
          }

          let finished = 0;
          let hasError = false;

          for (const member of members) {
            db.run(
              `
              INSERT INTO personal_events
              (user_id, day_of_week, period, event_name, group_event_id)
              VALUES (?, ?, ?, ?, ?)
              `,
              [
                  member.user_id,
                  day_of_week,
                  period,
                  event_name,
                  groupEventId
              ],
              (err) => {
                finished++;

                if (err) {
                  console.error("加入 personal_events 失敗：", err.message);
                  hasError = true;
                }

                if (finished === members.length) {
                  if (hasError) {
                    return res.json({
                      success: false,
                      message: "共同行程建立成功，但加入成員課表時發生錯誤"
                    });
                  }

                  res.json({
                    success: true,
                    message: "新增共同行程成功，已加入所有成員課表",
                    groupEventId: groupEventId
                  });
                }
              }
            );
          }
        }
      );
    }
  );
});


// 取消共同行程
router.delete('/events/:id', (req, res) => {
  const { id } = req.params;

  db.get(
    "SELECT * FROM group_events WHERE id = ?",
    [id],
    (err, groupEvent) => {
      if (err || !groupEvent) {
        return res.json({
          success: false,
          message: "找不到共同行程"
        });
      }

      db.run(
        "DELETE FROM personal_events WHERE group_event_id = ?",
        [groupEvent.id],
        (err) => {
          if (err) {
            return res.json({
              success: false,
              message: "刪除成員課表中的共同行程失敗"
            });
          }

          db.run(
            "DELETE FROM group_events WHERE id = ?",
            [id],
            function(err) {
              if (err) {
                return res.json({
                  success: false,
                  message: "取消共同行程失敗"
                });
              }

              res.json({
                success: true,
                message: "共同行程已取消"
              });
            }
          );
        }
      );
    }
  );
});

// 刪除群組
router.delete('/:groupId', (req, res) => {

  const { groupId } = req.params;

  // 先刪除所有成員課表中的共同行程
  db.run(
    `
    DELETE FROM personal_events
    WHERE group_event_id IN
    (
      SELECT id
      FROM group_events
      WHERE group_id = ?
    )
    `,
    [groupId],
    (err) => {

      if (err) {
        return res.json({
          success: false,
          message: "刪除個人課表中的共同行程失敗"
        });
      }

      // 刪除 group_events
      db.run(
        "DELETE FROM group_events WHERE group_id = ?",
        [groupId],
        (err) => {

          if (err) {
            return res.json({
              success: false,
              message: "刪除共同行程失敗"
            });
          }

          // 刪除 group_members
          db.run(
            "DELETE FROM group_members WHERE group_id = ?",
            [groupId],
            (err) => {

              if (err) {
                return res.json({
                  success: false,
                  message: "刪除群組成員失敗"
                });
              }

              // 最後刪除 group
              db.run(
                "DELETE FROM groups WHERE id = ?",
                [groupId],
                function (err) {

                  if (err) {
                    return res.json({
                      success: false,
                      message: "刪除群組失敗"
                    });
                  }

                  if (this.changes === 0) {
                    return res.json({
                      success: false,
                      message: "找不到群組"
                    });
                  }

                  res.json({
                    success: true,
                    message: "群組與所有共同行程已刪除"
                  });

                }
              );

            }
          );

        }
      );

    }
  );

});
export default router;