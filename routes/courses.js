import db from '../db.js';
import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage()
});


router.get('/', (req, res) => {
    res.send('courses route');
});

// 新增課程
router.post('/add', (req, res) => {
  const { user_id, day_of_week, period, course_name } = req.body;

  if (!user_id || !day_of_week || !period || !course_name) {
    return res.json({
      success: false,
      message: "請完整填寫課程資料"
    });
  }

  db.get(
    "SELECT * FROM courses WHERE user_id = ? AND day_of_week = ? AND period = ?",
    [user_id, day_of_week, period],
    (err, course) => {
      if (err) {
        return res.json({
          success: false,
          message: "資料庫錯誤"
        });
      }

      if (course) {
        return res.json({
          success: false,
          message: "該時段已有課程"
        });
      }

      db.run(
        "INSERT INTO courses (user_id, day_of_week, period, course_name) VALUES (?, ?, ?, ?)",
        [user_id, day_of_week, period, course_name],
        function(err) {
          if (err) {
            return res.json({
              success: false,
              message: "新增課程失敗"
            });
          }

          res.json({
            success: true,
            message: "新增課程成功",
            courseId: this.lastID
          });
        }
      );
    }
  );
});

// 取得使用者的課程表
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  db.all(
    "SELECT * FROM courses WHERE user_id = ?",
    [userId],
    (err, courses) => {
      if (err) {
        return res.json({
          success: false,
          message: "資料庫錯誤"
        });
      }

      res.json({
        success: true,
        courses: courses
      });
    }
  );
});


// 刪除課程
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run(
    "DELETE FROM courses WHERE id = ?",
    [id],
    function(err) {
      if (err) {
        return res.json({
          success: false,
          message: "刪除失敗"
        });
      }

      if (this.changes === 0) { //this.changes 是 sqlite3 提供的屬性，表示受影響的行數，如果為 0 表示沒有找到要刪除的課程
        return res.json({
          success: false,
          message: "找不到課程"
        });
      }

      res.json({
        success: true,
        message: "課程刪除成功"
      });
    }
  );
});


// 解析 PDF 課表
router.post('/parse-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({
        success: false,
        message: "請上傳 PDF 檔案"
      });
    }

    const pdfData = await pdfParse(req.file.buffer, {
      pagerender: renderSchedulePage
    });

    let parsedCourses = parseScheduleTextV2(pdfData.text);

    if (parsedCourses.length === 0) {
      const fallbackData = await pdfParse(req.file.buffer);
      parsedCourses = parseScheduleText(fallbackData.text);
    }

    res.json({
      success: true,
      message: "PDF 解析成功",
      courses: parsedCourses
    });

  } catch (err) {
    console.error(err);

    res.json({
      success: false,
      message: "PDF 解析失敗"
    });
  }
});

// 解析課表文字
function parseScheduleText(text) {
  const courses = [];

  const dayOrder = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"];

  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "");

  const ignoreKeywords = [
    "逢甲大學",
    "學年度",
    "課表",
    "星期",
    "無上課時間清單",
    "學分",
    "必選修",
    "開課別",
    "科目名稱",
    "選課代號",
    "開課班級",
    "|"
  ];

  const locationKeywords = [
    "資電",
    "人",
    "圖",
    "商",
    "忠",
    "語",
    "游翰堂",
    "電腦實習"
  ];

  function isPeriod(line) {
    return /^(1[0-4]|[1-9])$/.test(line);
  }

  function isTime(line) {
    return /^\d{2}:\d{2}$/.test(line);
  }

  function isIgnored(line) {
    return ignoreKeywords.some(keyword => line.includes(keyword));
  }

  function isLocation(line) {
    return locationKeywords.some(keyword => line.includes(keyword));
  }

  function cleanCourseName(line) {
    return line
      .replace(/\(.+?\)/g, "")
      .replace(/（.+?）/g, "")
      .replace(/\s+/g, "")
      .trim();
  }

  let buffer = [];

  for (const line of lines) {
    if (isPeriod(line)) {
      const period = Number(line);

      const courseNames = buffer
        .filter(item => !isTime(item))
        .filter(item => !isIgnored(item))
        .filter(item => !isLocation(item))
        .map(item => cleanCourseName(item))
        .filter(item => item.length >= 2);

      courseNames.forEach((courseName, index) => {
        const day = dayOrder[index];

        if (day && ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(day)) {
          courses.push({
            day_of_week: day,
            period: period,
            course_name: courseName
          });
        }
      });

      buffer = [];
    } else {
      buffer.push(line);
    }
  }

  return courses;
}

function renderSchedulePage(pageData) {
  return pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false
  }).then(textContent => JSON.stringify(
    textContent.items.map(item => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width || 0
    }))
  ));
}

function parseScheduleTextV2(text) {
  const items = readPositionedItems(text);

  if (items.length === 0) {
    return [];
  }

  const dayHeaders = [
    { text: "星期一", day: "Mon" },
    { text: "星期二", day: "Tue" },
    { text: "星期三", day: "Wed" },
    { text: "星期四", day: "Thu" },
    { text: "星期五", day: "Fri" },
    { text: "星期六", day: "Sat" },
    { text: "星期日", day: "Sun" }
  ].map(header => {
    const item = items.find(candidate => candidate.text === header.text);

    return item ? {
      day: header.day,
      x: item.x + item.width / 2
    } : null;
  }).filter(Boolean);

  const periods = items
    .map(item => ({
      period: Number(item.text.trim()),
      y: item.y
    }))
    .filter(item => Number.isInteger(item.period) && item.period >= 1 && item.period <= 14)
    .filter(item => item.y < 760)
    .sort((a, b) => b.y - a.y);

  if (dayHeaders.length < 5 || periods.length < 8) {
    return [];
  }

  const groups = new Map();

  for (const item of items) {
    const raw = item.text.trim();

    if (!raw || isScheduleNoiseV2(raw)) {
      continue;
    }

    const period = findNearestPeriodV2(item, periods);
    const day = findNearestDayV2(item, dayHeaders);

    if (!period || !day || Math.abs(item.y - period.y) > 24) {
      continue;
    }

    const key = `${day.day}-${period.period}`;

    if (!groups.has(key)) {
      groups.set(key, {
        day_of_week: day.day,
        period: period.period,
        items: []
      });
    }

    groups.get(key).items.push(item);
  }

  const courses = [];

  for (const group of groups.values()) {
    if (!["Mon", "Tue", "Wed", "Thu", "Fri"].includes(group.day_of_week)) {
      continue;
    }

    const courseName = buildCourseNameV2(group.items);

    if (!courseName) {
      continue;
    }

    courses.push({
      day_of_week: group.day_of_week,
      period: group.period,
      course_name: courseName
    });
  }

  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return courses.sort((a, b) =>
    a.period - b.period ||
    dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week)
  );
}

function readPositionedItems(text) {
  return text
    .split("\n")
    .map(part => part.trim())
    .filter(Boolean)
    .flatMap(part => {
      try {
        const parsed = JSON.parse(part);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })
    .filter(item =>
      item &&
      typeof item.text === "string" &&
      Number.isFinite(item.x) &&
      Number.isFinite(item.y)
    );
}

function findNearestPeriodV2(item, periods) {
  return periods.reduce((nearest, period) => {
    if (!nearest) {
      return period;
    }

    return Math.abs(item.y - period.y) < Math.abs(item.y - nearest.y) ? period : nearest;
  }, null);
}

function findNearestDayV2(item, dayHeaders) {
  const itemCenter = item.x + (item.width || 0) / 2;

  return dayHeaders.reduce((nearest, day) => {
    if (!nearest) {
      return day;
    }

    return Math.abs(itemCenter - day.x) < Math.abs(itemCenter - nearest.x) ? day : nearest;
  }, null);
}

function isScheduleNoiseV2(text) {
  return (
    text === "|" ||
    /^\d{2}:\d{2}$/.test(text) ||
    /^(1[0-4]|[1-9])$/.test(text) ||
    text.includes("逢甲大學") ||
    text.includes("課表") ||
    text.includes("無上課時間清單") ||
    text.startsWith("星期")
  );
}

function buildCourseNameV2(items) {
  const text = items
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .map(item => item.text.trim())
    .filter(itemText => itemText && !isLocationTextV2(itemText))
    .join("")
    .replace(/\s+/g, "");

  return cleanCourseNameV2(text);
}

function isLocationTextV2(text) {
  return /^(資電|忠|人|圖|語|商|電通|科航|體館|游翰堂|V\d{3}|[A-Z]\d{3})/.test(text);
}

function cleanCourseNameV2(text) {
  return text
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/\([^()]*\)$/, "")
    .replace(/\s+/g, "")
    .trim();
}

export { parseScheduleTextV2, renderSchedulePage };

export default router;
