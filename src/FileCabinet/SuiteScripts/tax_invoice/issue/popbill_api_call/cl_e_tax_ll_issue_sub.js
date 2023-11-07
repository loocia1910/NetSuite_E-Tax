//-----------------------------------------------------------------------------------------------------------
// Create Date  : 20231027
// Last Updated : 20231027
// Authors      : YHKIM <Wilus Inc.>
// Application  : E-Tax Invoice Issuance Status Checking
// Purpose      : 집계처리 진행결과 페이지 클라이언트 스크립트
// Update Desc. : 2022.1 업데이트에 대응한 스크립트 DOM 조작방식 변경
//-----------------------------------------------------------------------------------------------------------
// ※ CAUTION    : 2.x 버전은 ES5 버전의 JS만 지원됩니다.
//-----------------------------------------------------------------------------------------------------------


/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(["N/url", "N/runtime", "N/search", "N/ui/dialog", 'N/https',], function (
  url,
  runtime,
  search,
  dialog,
  https
) {
  var staticProgressNumber = 0;
  var errorCount = 0;

  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  function pageInit(scriptContext) {}


  // function doRefresh() {
  //   location.reload();
  // }

  function doBack() {
    window.history.back();
  }

  function postBulkSubmit() {
    try {

      dialog.create({
        title: "NOTICE",
        message:
          '<p>프로세스를 처리중입니다. 잠시만 기다려주세요.</p>' +
          '<div class="text-center" style="padding-bottom: 15px;">' +
          '     <div class="spinner-border text-muted" id="spinner">' +
          '         <span class="sr-only">Loading..</span>' +
          '     </div>' +
          '</div>' +
          '<div class="progress" style="height:20px">' +
          '     <div id="proBar" class="progress-bar" style="width:0%;height:20px"></div>' +
          '</div>'
        //   '<div class="uir-message-buttons">' +
        //   '     <button id="refr" value="true" style="display: none" onclick="javascript: NS.jQuery(`#modalmsg`).remove();">OK</button>' +
        //   '</div>' +
        //   '<div style="font-size:11px;">' +
        //   '<span>※ 처리가 끝날 때 까지 확인버튼을 누르지 마세요!</span><br/>' +
        //   '<span>※ 처리엔 다소의 시간이 소요되며, 에러 발생시 화면에 표기되오니 잠시만 기다려주세요.</span>' +
        //   '</div>',
        // buttons: [{ label: "확인", value: "true" }],
      })
      .then(async function (result) {
      ///------------------------------------------
        // 화면상에 있는 invoice 정보 가져오기 
        let invoiceInfoList =  JSON.parse(getParameterFromURL('array'));


        const batchSize = 100;
        const batchedData = [];
        const submitIdList = [];

        for (let i = 0; i < invoiceInfoList.length; i += batchSize) {
          const batch = invoiceInfoList.slice(i, i + batchSize);
          batchedData.push(batch);
        }
  
        console.log("invoiceInfoList -----", invoiceInfoList)
        console.log("batchedData.length ----", batchedData.length)
        
        // 1) 100건 씩 bulkSubmit 호출 (Reason: Popbill 최대 요청 건수 100건)
        const groupSubmitId = runtime.getCurrentUser().id + "-" +  getCurrentJulianDate();
        for (let i = 0; i < batchedData.length; i++) {
          const submitId = groupSubmitId + "-" + i;
          const res = await createtBulkSubmitPromise(submitId, batchedData[i]);
          const parsedRes = JSON.parse(res.body);
          console.log('res----- ', res);
          console.log('parsedRes----- ', parsedRes);
          submitIdList.push(parsedRes)
        }
  
  
        console.log('getBulkSubmitResult 호출전  ----- ', submitIdList);
  
        // 2) getBulkSubmitResult 호출 
        let idx = 0;
        while(submitIdList.length === 0) {
          const res = await getBulkSubmitResultPromise(submitIdList[idx]);
          console.log('postBulkSubmit res----- ', res);
          if(res.txState === 2) { 
            // 성공했을 경우 다음 submitId 결과 호출
            // GetBulkResult API : txState(접수상태)가 2(완료)일 때, 개별 세금계산서 발행결과(성공/실패) 확인이 가능
            submitIdList.shift();
          }
          
          idx++;
          idx >=  idxArr.length ? 0 : idx;
  
          console.log('postBulkSubmit idxArr----- ', idxArr);
          console.log('postBulkSubmit idx----- ', idx);
        }
  
  
        // dialog.alert({
        //     title: 'Message',
        //     message: "bulkSubmit성공"
        // });
      ///------------------------------------------
      })
      .catch(function (reason) {
        dialog.alert({
          title: "CAUTION",
          message: "처리 중 에러가 발생하였습니다. \n Cause: " + reason,
        });
      });


      } catch(e) {
          throw(e);
      }
  };

  
  function createtBulkSubmitPromise( SubmitID, invoiceInfoList ) { 
        
    const restletUrl = url.resolveScript({
        scriptId: 'customscript_e_tax_ll_create',
        deploymentId: 'customdeploy_e_tax_ll_create'
    });

    const headerObj = new Array();
    headerObj['Content-Type'] = 'application/json';
    headerObj['Accept'] = '*/*';
    console.log("invoiceInfoList ---->", invoiceInfoList)

    const body = { 
      SubmitID: SubmitID,
      invoiceInfoList: invoiceInfoList
    };

    console.log("body ---", body)
    return https.post.promise({
              url: restletUrl,
              headers: headerObj,
              body: JSON.stringify(body),
          });
  };


  // function getBulkSubmitResultPromise( SubmitID ) { 
        
  //   const restletUrl = url.resolveScript({
  //       scriptId: 'customscript_ll_get_res',
  //       deploymentId: 'customdeploy_ll_get_res'
  //   });

  //   const headerObj = new Array();
  //   headerObj['Content-Type'] = 'application/json';

  //   const body = { SubmitID };

  //   return https.get.promise({
  //             url: restletUrl,
  //             headers: headerObj,
  //             body: JSON.stringify(body),
  //         });
  // };


  function getParameterFromURL(param) {
    const query = window.location.search.substring(1);
    const vars = query.split("&");
      for (let i = 0; i < vars.length; i++) {
          let pair = vars[i].split("=");
          if (pair[0] === param) {
              return decodeURIComponent(pair[1]);
          }
      }
      return false;
  }


  function getCurrentJulianDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 월은 0부터 시작하므로 +1 해줍니다.
    const day = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const second = now.getSeconds();
  
    // 율리우스 (Julian) 날짜 계산식 사용
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
  
    const julianDay =
      day +
      Math.floor((153 * m + 2) / 5) +
      365 * y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) -
      32045;
  
    // 시, 분, 초를 시간으로 변환하여 더합니다.
    const julianTime = hour / 24 + minute / 1440 + second / 86400;
  
    return String(julianDay + julianTime).replace('.', '-');
  }

  




  return {
    pageInit,
    doBack,
    postBulkSubmit
    // doAggr,
    // doRefresh,
  };
});
