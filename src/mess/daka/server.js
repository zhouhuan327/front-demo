const fetch = require('node-fetch');
const chalk = require('chalk');
const api = 'https://daka.zcmu.edu.cn/questionnaireSurvey';
const { URLSearchParams } = require('url');

const params = new URLSearchParams();
const request = (url = '', body = {}) => {
  Object.entries(body).forEach(([key, value]) => {
    params.append(key, value);
  });
  return new Promise((resolve, reject) => {
    fetch(url, {
      method: 'post',
      body: params,
      headers: {
        Host: 'daka.zcmu.edu.cn',
        Connection: 'keep-alive',
        origin: 'https://daka.zcmu.edu.cn',
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10; SM-G9708 Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045513 Mobile Safari/537.36 MMWEBID/8563 MicroMessenger/8.0.1840(0x28000037) Process/tools WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })
      .then((response) => response.json())
      .then((res) => {
        resolve(res);
      })
      .catch((err) => reject(err));
  });
};
const getQuesId = (userId) =>
  request(`${api}/queryQuestionnairePageList`, {
    pageNum: 1,
    nodataFlag: false,
    pageSize: 10,
    userId,
  });
const getQuesDetail = (questionnaireId, userId) =>
  request(`${api}/queryQuestionnaireDetail`, {
    questionnaireId,
    userId,
  });
const add = (questionnaireId, userId, answerData) =>
  request(`${api}/addQuestionnaireRecord`, {
    questionnaireId,
    userId,
    answerData,
  });
// 值为未填项的options的数组下表
const emptyAnswerMap = {
  Q4: 0,
  Q7: 0,
  Q13: 0,
  Q20: 1, // 是否聚餐
  Q22: 1, // 是否来校
  Q30: 3,
  Q31: 0,
  Q32: 4,
};
// 是否打过卡
const renderAnswerData = (detail) => {
  const answerData = [];
  const rows = detail && detail.rows;
  // 忽略第一项
  for (let i = 1; i < rows.length; i++) {
    const item = rows[i];
    // 三个提交字段
    const itemType = item.TYPE;
    const itemId = item.ITEMID;
    const answerArr = [];
    // 这一项本来是体温输入框,但是隐藏了
    if (item.INDEX === 'Q15') {
      continue;
    }
    // 有答案的是普通输入框
    if (item.ANSWERTEXT) {
      answerArr[0] = item.ANSWERTEXT;
    }
    // 多选框
    if (
      ['radio', 'checkbox', 'imgRadio', 'imgCheckbox'].includes(itemType) &&
      item.OPTIONS
    ) {
      const options = item.OPTIONS;
      // 根据CHECKED 找到选中项
      const target = options.find((o) => o.CHECKED === true);
      if (target) {
        answerArr[0] = target.SUBID;
      } else {
        // 未填的
        const targetIndex = emptyAnswerMap[item.INDEX];
        answerArr[0] = options[targetIndex].SUBID;
        console.log(
          '未填项:',
          `${item.INDEX} ${item.TITLE}`,
          chalk.cyan(`填了: ${options[targetIndex].OPTION}`)
        );
      }
    }
    answerData.push({ itemId, itemType, answerArr });
  }
  return answerData;
};
async function run(id) {
  if (id > 100) {
    console.log(chalk.red('请输入学号后两位'));
    return;
  }
  if (![23, 24, 25, 26, 27, 28].includes(id)) {
    console.log(chalk.red('暂不支持这个尾号'));
    return;
  }
  const USERID = `2019122431020${id}`;
  console.log(chalk.magenta('Run script..'));

  console.log(chalk.green('学号', USERID));
  try {
    console.log(chalk.green('正在获取表单id...'));
    const quesInfo = await getQuesId(USERID);
    const questionnaireId = quesInfo.rows.length > 0 && quesInfo.rows[0].ID;
    console.log('表单id:', chalk.cyan(questionnaireId));

    console.log(chalk.green('正在获取表单详情...'));
    const detail = await getQuesDetail(questionnaireId, USERID);
    if (detail.rows && detail.rows[0] && detail.rows[0].HASANSWER === true) {
      console.log(chalk.magenta('已经打过了'));
      return;
    }
    console.log('字段个数:', chalk.cyan(detail.rows.length));
    console.log(chalk.green('正在生成提交字段..'));
    const answerData = renderAnswerData(detail);
    console.log('提交字段个数:', chalk.cyan(answerData.length));
    console.log(chalk.green('提交中...'));
    const answerJSON = JSON.stringify({ answerData });
    const res = await add(questionnaireId, USERID, answerJSON);
    if (res.rspcode == 000000) {
      console.log(chalk.magenta('成功'));
    }
  } catch (e) {
    console.log(chalk.red(e));
  }
}
module.exports.run = run;
