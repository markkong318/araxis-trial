const colors = require('colors');
const puppeteer = require('puppeteer');
const sleep = require('await-sleep');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--lang=en-US']
  });

  console.log('Getting a free email...');

  const page_mail = await browser.newPage();
  await page_mail.goto('https://10minutemail.net/');
  await page_mail.waitForSelector('#fe_text');

  const mail_address = await page_mail.$eval('#fe_text', el => el.value);
  console.log(`Temporary mail: ${mail_address}`);

  console.log('Accessing evaluation page...');
  const page_araxis = await browser.newPage();
  await page_araxis.goto('https://logic.araxis.com/CustomerSupport/MergeEvaluationF.xml');
  await page_araxis.waitFor('#R_MergeEvaluationFd0e311');
  await page_araxis.type('#R_MergeEvaluationFd0e311', mail_address);
  await page_araxis.click('#C_MergeEvaluationFd0e358');

  console.log('Checking mail...');
  let next_url = '';
  let retry = 0;
  const max_retry = 60;
  while (!next_url) {
    next_url = await page_mail.evaluate(() => {
      const node_list = document.querySelectorAll('#mailbox a');

      let url = '';
      for (let i = 0; i < node_list.length; i++) {
        if (node_list[i].innerText.match(/^Araxis\sMerge/)) {
          url = node_list[i].href;
          break;
        }
      }

      return url;
    });

    if (next_url) {
      break;
    }

    retry++;

    if (retry > max_retry) {
      console.log('Receive registration mail failed'.red);
      process.exit(0);
    }

    await sleep(1000);
  }

  await page_mail.goto(next_url);
  await page_mail.waitFor('.mailinhtml');
  const mail = await page_mail.$eval('.mailinhtml', el => el.innerHTML);

  //Mail example:
  //Thank you for your interest in Araxis Merge for Windows and/or macOS. <br><br>Your fully functional 30-day evaluation serial number for the Professional <br>Edition of Merge is: <br><br> UJwTBHmQ:AKrj7qta:TNd]d59K:InWgADRQ:G*n]q4HI:msIeXeQQ <br><br>You may download Merge from: <br><br> <a href="https://www.araxis.com/url/merge/download.uri" target="_blank">https://www.araxis.com/url/merge/download.uri</a> <br><br>Note: Merge will ask you for your serial number the first time it is <br>run. To avoid problems, we recommend that you copy and paste the serial <br>number from this message. <br><br>If You Have Questions <br><br>If you have questions about Merge, please contact us using the support <br>form on the Araxis website at: <br><br> <a href="https://www.araxis.com/2006/support.uri" target="_blank">https://www.araxis.com/2006/support.uri</a> <br><br>-- <br>Cara Neades <br>Araxis Ltd <br>www.araxis.com
  const splits = mail.split('<br>');

  const matches = splits[5].match(/^\s(.+)\s$/);
  const serial = matches[1];

  console.log(`Trial Serial Number is ${serial.green}`);

  await browser.close();
})();