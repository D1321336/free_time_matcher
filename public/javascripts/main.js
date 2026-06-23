console.log("main.js 已成功載入");

// 按「註冊」
document.getElementById("showRegisterBtn").onclick = () => {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("registerPage").style.display = "flex";
};

// 按「返回登入」
document.getElementById("backLoginBtn").onclick = () => {
    document.getElementById("registerPage").style.display = "none";
    document.getElementById("loginPage").style.display = "flex";
};

// 按「登入」
const loginBtn = document.getElementById("loginBtn");
loginBtn.onclick = async () => {
    const student_id = document.getElementById("loginStudentId").value;

    const password = document.getElementById("loginPassword").value;
    const response = await fetch(
        "/users/login",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                student_id,
                password
            })
        }
    );
    const data = await response.json();

    if (data.success) {

        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );

        document.getElementById("loginPage").style.display = "none";
        document.getElementById("mainPage").style.display = "block";
        document.getElementById("welcomeText").innerText = "歡迎回來! " + data.user.name;

        loadCourses();
        loadGroups();
    }
    else {
        alert(data.message);
    }
};


// 按「註冊」
document.getElementById("registerBtn").onclick = async () => {
    const name = document.getElementById("registerName").value;
    const student_id = document.getElementById("registerStudentId").value;
    const password = document.getElementById("registerPassword").value;

    const response = await fetch("/users/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            student_id,
            password
        })
    });

    const data = await response.json();

    alert(data.message);

    if (data.success) {
        document.getElementById("registerPage").style.display = "none";
        document.getElementById("loginPage").style.display = "flex";

        document.getElementById("registerName").value = "";
        document.getElementById("registerStudentId").value = "";
        document.getElementById("registerPassword").value = "";
    }
};

// 課表 載入函式
async function loadCourses()
{
    const user =
        JSON.parse(
            localStorage.getItem("user")
        );

    const response = await fetch("/courses/" + user.id);
    const data = await response.json();
    const eventResponse =
        await fetch(
            "/events/" + user.id
        );

    const eventData = await eventResponse.json();

    console.log(data);

    const scheduleArea = document.getElementById("scheduleArea");
    scheduleArea.innerHTML = "";

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    let html = `
    <table border="1">
    <tr>
    <th>節次</th>
    `;

    for (const day of days)
    {
        html += `<th>${day}</th>`;
    }

    html += "</tr>";

    for (let period = 1; period <= 14; period++)
    {
        html += `<tr>`;
        html += `<td>${period}</td>`;

        for (const day of days) {
            const course = data.courses.find(
            c => c.day_of_week === day && c.period === period
            );
            const event = eventData.events.find(
            e =>
            e.day_of_week === day &&
            e.period === period
        );

        if(course)
        {
            html += `
            <td
            onclick="deleteCourse(${course.id})"
            style="
            background:#b8d8ff;
            font-weight:bold;
            cursor:pointer;
            ">
            ${course.course_name}
            </td>
            `;
        }

        else if(event)
        {
            html += `
            <td
            onclick="deleteEvent(${event.id})"
            style="
            background:#FFF4B5;
            font-weight:bold;
            cursor:pointer;
            ">
            ${event.event_name}
            </td>
            `;
        }

        else
        {
            html += `
            <td
            class="empty-cell"
            onclick="addCourse('${day}',${period})"
            style="
            cursor:pointer;
            color:#aaa;
            "
            >
            +
            </td>
            `;
        }
        }

        html += `</tr>`;

    }

    html += `</table>`;

    scheduleArea.innerHTML = html;
}

// 點擊空白格子新增課程
async function addCourse(day, period)
{
    const type =
        prompt(
            "請輸入：\n1 = 新增課程\n2 = 新增行程"
        );

    // 新增課程
    if(type=="1")
    {
        const courseName =
            prompt(
                `請輸入 ${day} 第${period}節課程名稱`
            );

        if(!courseName)
        {
            return;
        }

        const user =
            JSON.parse(
                localStorage.getItem("user")
            );

        const response =
            await fetch(
                "/courses/add",
                {
                    method:"POST",

                    headers:{
                        "Content-Type":
                        "application/json"
                    },

                    body:JSON.stringify({
                        user_id:user.id,
                        day_of_week:day,
                        period:period,
                        course_name:courseName
                    })
                }
            );

        const data =
            await response.json();

        alert(data.message);

        if(data.success)
        {
            loadCourses();
        }
    }

    // 新增行程
    else if (type == "2") {
        const eventName = prompt(`請輸入 ${day} 第${period}節行程名稱`);

        if (!eventName) {
            return;
        }

        const user = JSON.parse(localStorage.getItem("user"));

        const response = await fetch("/events/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: user.id,
                day_of_week: day,
                period: period,
                event_name: eventName
            })
        });

        const data = await response.json();

        alert(data.message);

        if (data.success) {
            loadCourses();
        }
    }
}


// 點擊課程刪除課程
async function deleteCourse(id)
{
    if (!confirm("確定刪除？"))
    {
        return;
    }

    const response =
        await fetch(
            "/courses/" + id,
            {
                method: "DELETE"
            }
        );

    const data = await response.json();

    alert(data.message);

    if (data.success)
    {
        loadCourses();
    }
}

// 點擊行程刪除行程
async function deleteEvent(id)
{
    if(!confirm("完成行程？"))
    {
        return;
    }

    const response =
        await fetch(
            "/events/" + id,
            {
                method:"DELETE"
            }
        );

    const data =
        await response.json();

    alert(data.message);

    if(data.success)
    {
        loadCourses();
    }
}

// 建立群組
const createGroupBtn =
    document.getElementById(
        "createGroupBtn"
    );

createGroupBtn.onclick =
async () =>
{
    const group_name =
        document.getElementById(
            "groupNameInput"
        ).value;

    const user =
        JSON.parse(
            localStorage.getItem(
                "user"
            )
        );

    const response =
        await fetch(
            "/groups/create",
            {
                method:"POST",

                headers:{
                    "Content-Type":
                    "application/json"
                },

                body:JSON.stringify(
                {
                    group_name,
                    owner_id:user.id
                })
            }
        );

    const data = await response.json();

    alert(data.message);

    if(data.success)
    {
        loadGroups();
    }

    alert(data.message);
};

// 群組列表 載入函式
async function loadGroups()
{
    const user =
        JSON.parse(
            localStorage.getItem("user")
        );

    const response =
        await fetch(
            "/groups/" + user.id
        );

    const data =
        await response.json();

    console.log(data);

    const groupArea =
        document.getElementById(
            "groupArea"
        );

    groupArea.innerHTML = "";

    for (const group of data.groups)
    {
        groupArea.innerHTML += `
            <div class="group-card" onclick="selectGroup(${group.id}, '${group.group_name}')">
                ${group.group_name}
            </div>
        `;
    }
}

function selectGroup(groupId, groupName)
{
    const groupDetailArea =
        document.getElementById("groupDetailArea");

    groupDetailArea.innerHTML = `

        <hr>

        <h3>${groupName}</h3>

        <button onclick="deleteGroup(${groupId})">
            刪除群組
        </button>

        <h4>加入成員</h4>

        <input
            id="memberStudentIdInput"
            placeholder="輸入成員學號">

        <button onclick="addMember(${groupId})">
            加入成員
        </button>

        <h4>群組成員</h4>

        <div id="memberArea"></div>

        <h4>共同空堂</h4>

        <button onclick="loadFreeTime(${groupId})">
            查詢共同空堂
        </button>

        <div id="freeTimeArea"></div>
    `;

    loadMembers(groupId);
}


// 加入群組成員
async function loadMembers(groupId)
{
    const response =
        await fetch(
            "/groups/" + groupId + "/members"
        );

    const data =
        await response.json();

    const memberArea =
        document.getElementById("memberArea");

    memberArea.innerHTML = "";

    for (const member of data.members)
    {
        memberArea.innerHTML += `
            <p>
                ${member.name} (${member.student_id})
            </p>
        `;
    }
}


// 加入群組成員
async function addMember(groupId)
{
    const student_id =
        document.getElementById("memberStudentIdInput").value;

    const response =
        await fetch(
            "/groups/add-member",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    group_id: groupId,
                    student_id: student_id
                })
            }
        );

    const data = await response.json();

    alert(data.message);

    if (data.success) {
        loadMembers(groupId);
    }
}

// 查詢群組共同空堂
async function loadFreeTime(groupId)
{
    const response =
        await fetch(
            "/groups/" + groupId + "/free-time"
        );

    const data =
        await response.json();

    const freeTimeArea =
        document.getElementById(
            "freeTimeArea"
        );

    freeTimeArea.innerHTML = "";

    const days = ["Mon","Tue","Wed","Thu","Fri"];

    let html = `
    <h4>共同空堂</h4>

    <table>

    <tr>

    <th>節次</th>
    `;

    for(const day of days)
    {
        html += `<th>${day}</th>`;
    }

    html += "</tr>";

    for(let period=1;period<=14;period++)
    {
        html += "<tr>";

        html += `<td>${period}</td>`;

        for(const day of days)
        {
            const free =
                data.freeTimes.find(
                    t =>
                    t.day===day &&
                    t.period===period
            );
            const groupEvent =
            data.groupEvents.find(
                e =>
                e.day_of_week === day &&
                Number(e.period) === period
            );

            if (groupEvent) {
                html += `
                <td
                onclick="deleteGroupEvent(${groupEvent.id}, ${groupId})"
                style="
                background:#FFD966;
                font-weight:bold;
                cursor:pointer;
                ">
                ${groupEvent.event_name}
                </td>
                `;
            }
            else if (free) {
                html += `
                <td
                onclick="addGroupEvent(${groupId}, '${day}', ${period})"
                style="
                background:#90EE90;
                font-weight:bold;
                cursor:pointer;
                ">
                +
                </td>
                `;
            }
            else {
                html += "<td></td>";
            }
        }

        html += "</tr>";
    }
    html += "</table>";

    freeTimeArea.innerHTML = html;
}

// 登出
document.getElementById("logoutBtn").onclick = () => {

    localStorage.removeItem("user");

    document.getElementById("mainPage").style.display = "none";

    document.getElementById("loginPage").style.display = "flex";

};


// PDF 解析
// PDF 解析結果暫存
let parsedCourses = [];

// PDF 解析
document.getElementById("parsePdfBtn").onclick = async () => {
    const file = document.getElementById("pdfInput").files[0];

    if (!file) {
        alert("請選擇 PDF");
        return;
    }

    const formData = new FormData();
    formData.append("pdf", file);

    const response = await fetch("/courses/parse-pdf", {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    alert(data.message);

    if (!data.success) {
        return;
    }

    parsedCourses = data.courses;

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

    let html = `
        <h4>PDF解析結果</h4>

        <table border="1">
            <tr>
                <th>節次</th>
    `;

    for (const day of days) {
        html += `<th>${day}</th>`;
    }

    html += `</tr>`;

    for (let period = 1; period <= 14; period++) {
        html += `<tr>`;
        html += `<td>${period}</td>`;

        for (const day of days) {
            const course = parsedCourses.find(
                c => c.day_of_week === day && Number(c.period) === period
            );

            html += `
                <td style="background:#FFF4B5;">
                    <input
                        class="pdf-course-input"
                        data-day="${day}"
                        data-period="${period}"
                        value="${course ? course.course_name : ""}"
                        placeholder="+"
                        style="width:120px;"
                    >
                </td>
            `;
        }

        html += `</tr>`;
    }

    html += `</table>`;

    document.getElementById("pdfPreviewArea").innerHTML = html;
    document.getElementById("confirmImportBtn").style.display = "inline-block";
    document.getElementById("cancelImportBtn").style.display = "inline-block";
};


// 確認匯入 PDF 課表
document.getElementById("confirmImportBtn").onclick = async () => {
    const user = JSON.parse(localStorage.getItem("user"));

    const inputs = document.querySelectorAll(".pdf-course-input");

    const coursesToImport = [];

    inputs.forEach(input => {
        const courseName = input.value.trim();

        if (courseName !== "") {
            coursesToImport.push({
                day_of_week: input.dataset.day,
                period: Number(input.dataset.period),
                course_name: courseName
            });
        }
    });

    if (coursesToImport.length === 0) {
        alert("沒有可匯入的課程");
        return;
    }

    for (const course of coursesToImport) {
        await fetch("/courses/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: user.id,
                day_of_week: course.day_of_week,
                period: course.period,
                course_name: course.course_name
            })
        });
    }

    alert("匯入完成");

    document.getElementById("pdfPreviewArea").innerHTML = "";
    document.getElementById("confirmImportBtn").style.display = "none";
    document.getElementById("cancelImportBtn").style.display = "none";
    document.getElementById("pdfInput").value = "";

    loadCourses();
};

document.getElementById("cancelImportBtn").onclick = () => {
    parsedCourses = [];

    document.getElementById("pdfPreviewArea").innerHTML = "";

    document.getElementById("confirmImportBtn").style.display = "none";
    document.getElementById("cancelImportBtn").style.display = "none";

    document.getElementById("pdfInput").value = "";

    alert("已取消匯入");
};


// 點擊空白格子新增共同行程
async function addGroupEvent(groupId, day, period)
{
    const eventName =
        prompt(`請輸入 ${day} 第${period}節 的共同行程名稱`);

    if (!eventName) {
        return;
    }

    const response =
        await fetch(
            "/groups/events/add",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    group_id: groupId,
                    day_of_week: day,
                    period: period,
                    event_name: eventName
                })
            }
        );

    const data =
        await response.json();

    alert(data.message);

    if (data.success) {
        loadFreeTime(groupId);
        loadCourses();
    }
}


async function deleteGroupEvent(groupEventId, groupId)
{
    if (!confirm("確定取消這個共同行程？"))
    {
        return;
    }

    const response =
        await fetch(
            "/groups/events/" + groupEventId,
            {
                method: "DELETE"
            }
        );

    const data = await response.json();

    alert(data.message);

    if (data.success) {
        loadFreeTime(groupId);
        loadCourses();
    }
}


// 刪除群組
async function deleteGroup(groupId)
{
    if (!confirm("確定刪除這個群組？")) {
        return;
    }

    const response = await fetch(
        "/groups/" + groupId,
        {
            method: "DELETE"
        }
    );

    const data = await response.json();

    alert(data.message);

    if (data.success) {
        document.getElementById("groupDetailArea").innerHTML = "";
        loadGroups();
        loadCourses();
    }
}