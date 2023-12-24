// ==UserScript==
// @name        二八轮动
// @namespace   Violentmonkey Scripts
// @match       file:///C:/Codes/git/gitee/bytedynamic/private/kitchen/twenty_eighty/index.html
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @version     1.0
// @author      -
// @description 2023/12/23 01:05:34
// ==/UserScript==


(function () {
  "use strict";
  var button1 = document.getElementById("confirm");
  var button2 = document.getElementById("calculate");
  document.getElementById("name").value = GM_getValue("ids");
  document.getElementById("date_range").value = GM_getValue("date_range");
  button1.addEventListener("click", modifiedParams);
  button2.addEventListener("click", getPrices);
})();

function getCurrentTime() {
  var date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const now = `${year}${month}${day}`;
  return now;
}

function modifiedParams() {
  let ids = document.getElementById("name").value;
  GM_setValue("ids", ids);
  let dts = document.getElementById("date_range").value;
  GM_setValue("date_range", dts);
  alert("监控指标更新成功！");
  document.getElementById("name").value = GM_getValue("ids");
  document.getElementById("date_range").value = GM_getValue("date_range");
}

function skimNull(arr) {
  let nst = [];
  for (var i = 0, len = arr.length; i < len; i++) {
    if (arr[i]) {
      nst.push(arr[i]);
    }
  }
  return nst;
}

function tradeDate_desc(x, y) {
  return y.tradeDate - x.tradeDate;
}

function pnl_desc(x, y) {
  return y.pnl - x.pnl;
}

function getPrices() {
  let ids = skimNull(GM_getValue("ids").split(","));
  let date_range = GM_getValue("date_range");
  let endDate = getCurrentTime();
  let startDate = endDate - 10000;
  console.log(ids, date_range, startDate, endDate);
  let promiseArray = [];
  for (var i = 0, len = ids.length; i < len; i++) {
    let id = ids[i];
    if (!id.trim()) {
      continue;
    }
    let url = `https://www.csindex.com.cn/csindex-home/perf/index-perf?indexCode=${id}&startDate=${startDate}&endDate=${endDate}`;
    console.log(url);
    promiseArray.push(
      new Promise(function (resolve, reject) {
        GM_xmlhttpRequest({
          method: "GET",
          url: url,
          headers: { "Content-Type": "application/json;charset=UTF-8" },
          onload: function (response) {
            const txt = response.responseText;
            if (txt.length > 10 && response.status === 200) {
              var jtxt = JSON.parse(txt);
              let res = [];
              let small_json = jtxt["data"].sort(tradeDate_desc).slice(0,date_range);
              // small_json.forEach((data, index) => {
              //   res.push([data["tradeDate"], data["close"]]);
              // });
              res.push(
                // [
                  [small_json[0]["indexCode"],small_json[0]["indexNameCn"],small_json[0]["tradeDate"],small_json[0]["close"]],
                  [small_json[date_range-1]["indexCode"],small_json[date_range-1]["indexNameCn"],small_json[date_range-1]["tradeDate"],small_json[date_range-1]["close"]],
                // ]
              )
              resolve(res);
            } else {
              resolve(0);
            }
          },
          onerror: function (response) {
            reject("请求失败");
          },
        });
      })
    );
  }
  Promise.all(promiseArray)
    .then(function (res) {
      // console.log(res);
      let nres = [];
      for (var i = 0, len = res.length; i < len; i++) {
        let id = res[i][0][0];
        let cName = res[i][0][1];
        let tradeDate = res[i][0][2];
        let stradeDate = res[i][1][2];
        let sPrice = res[i][1][3];
        let ePrice = res[i][0][3];
        let pnl = (ePrice/sPrice-1)*100;
        nres.push({
          'id': id,
          'cName': cName,
          'tradeDate': tradeDate,
          'stradeDate': stradeDate,
          'sPrice': sPrice,
          'ePrice': ePrice,
          'pnl': pnl,
        });
      }
      nres = nres.sort(pnl_desc);
      let FUND_listHtml = '<tbody id="panel_content">';
      for (var i = 0, len = nres.length; i < len; i++) {
        let nresa = nres[i];
        FUND_listHtml += `<tr><td>${nresa["cName"]}<br>${nresa["id"]}</td><td>${nresa["stradeDate"]}：${nresa["sPrice"]}<br>${nresa["tradeDate"]}：${nresa["ePrice"]}</td><td>${nresa["pnl"].toFixed(2)}%</td></tr>`;
      }
      FUND_listHtml += "</tbody>";
      var container = document.getElementById("panel_content");
      container.innerHTML = FUND_listHtml;
    })
    .catch(function (reason) {
      console.log(reason);
    });
}