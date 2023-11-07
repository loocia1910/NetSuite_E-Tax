//-----------------------------------------------------------------------------------------------------------
// Create Date  : 
// Last Updated : 
// Authors      : YHKIM <Wilus Inc.>
// Application  : E-Tax Invoice Issuance
// Purpose      : Invoice Issuance Client Side JavaScript (DOM 조작, ajax 처리 등)
// Update Desc. : 
//-----------------------------------------------------------------------------------------------------------
// NetSuite Script Name : Popbil ETax CS / customscript_cl_e_tax_issue_sub
// NetSuite DeploymentID : _e_tax_issue_popbill
//-----------------------------------------------------------------------------------------------------------



/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
// const $ = NS.jQuery;
define(['N/currentRecord', 'N/url', 'N/runtime', 'N/record', 'N/search', 'N/ui/dialog', 'N/format',],
    function (currentRecord, url, runtime, record, search, dialog, format) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            // 현재 로딩된 페이지 정보 get
            var curr_record = scriptContext.currentRecord;

            // url로 전달된 Filter 조건들 분석
            var currentUrl = document.location.href;
            var curUrl = new URL(currentUrl);

            settingFieldValue(curUrl, curr_record);

            //DOM 조작을 통한 "거래처명" New버튼 숨김
            document.getElementById("custpage_kor_etax_field_entity_id_popup_new").style.cssText = 'display:none !important';
            //NS.jQuery('#custpage_kor_etax_field_entity_id_popup_new').css('display', 'none !important')
        }

        function fieldChanged(context) {
            // Sublist page Index가 변경되었을 때
            if (context.fieldId === 'custpage_pageid') {
                var pageId = currentRecord.get().getValue({
                    fieldId: 'custpage_pageid'  // pageid_'x'  x == number
                });
                pageId = parseInt(pageId.split('_')[1]);

                // 현재의 url에서 parameter를 가져옴
                var subsidiary_id = getParameterFromURL('subsidiary_id');
                var entity_id = getParameterFromURL('entity_id');
                var internal_id = getParameterFromURL('internal_id');
                var gl_from = getParameterFromURL('gl_from');
                var gl_to = getParameterFromURL('gl_to');
                var type = getParameterFromURL('type');
                var tax_item1 = getParameterFromURL('tax_item1');
                //var tax_item2     = getParameterFromURL('tax_item2');
                var flag = getParameterFromURL('flag');
                //var tax_date      = getParameterFromURL('tax_date');

                var params = {};
                params.page = pageId;
                if (subsidiary_id !== '') params.subsidiary_id = subsidiary_id;
                if (entity_id !== '') params.entity_id = entity_id;
                if (internal_id !== '') params.internal_id = internal_id;
                if (gl_from !== '') params.gl_from = gl_from;
                if (gl_to !== '') params.gl_to = gl_to;
                if (type !== '') params.type = type;
                if (tax_item1 !== '') params.tax_item1 = tax_item1;
                //if(tax_item2 != '')     params.tax_item2 = tax_item2;
                if (flag !== '') params.flag = flag;
                //if(tax_date != '')      params.tax_date = tax_date;


                window.onbeforeunload = null;   // page 이동 시 confirm 메세지 방지
                document.location = url.resolveScript({
                    scriptId: getParameterFromURL('script'),
                    deploymentId: getParameterFromURL('deploy'),
                    params: params
                });
            }
        }

        /* ▼ Custom Client Script ▼ */
        function doFind() {
            var subsidiary_id = currentRecord.get().getValue('custpage_kor_etax_field_subdiary_id');
            var entity_id = currentRecord.get().getValue('custpage_kor_etax_field_entity_id');
            var internal_id = currentRecord.get().getValue('custpage_kor_etax_field_transaction_id');
            var gl_from = currentRecord.get().getText('custpage_kor_etax_field_gl_date_from');
            var gl_to = currentRecord.get().getText('custpage_kor_etax_field_gl_date_to');
            var type = currentRecord.get().getValue('custpage_kor_etax_field_transaction_type');
            var tax_item1 = currentRecord.get().getValue('custpage_kor_etax_field_invoice_radios');
            //var tax_item2 = currentRecord.get().getValue('custpage_kor_etax_field_forward_issue_method_radios');
            var flag = currentRecord.get().getValue('custpage_kor_etax_field_issue_radios');
            

            
            // GL_From 이 To보다 큰 경우
            if (gl_from !== '') {

                // 날짜간의 비교는 객체로 진행해주어야 에러가 없음
                var gl_from_date = new Date(gl_from);
                var gl_to_date = new Date(gl_to);

                if (gl_from_date > gl_to_date) {
                    dialog.alert({
                        title: 'NOTICE',
                        message: 'G/L From 일자보다 이후의 날짜를 입력해주세요.'
                    });
                    // 아래의 DOM조작은 (document) 권장하는 방식이 아닙니다. (ID가 변경될 위험이 있기 때문에)
                    var gl_from_fd = document.getElementById('custpage_kor_etax_field_gl_date_from');
                    gl_from_fd.focus();
                    return false;  // 이후 로직 무시하고 false 리턴
                }
            }

            var params = {};
            if (subsidiary_id !== '') params.subsidiary_id = subsidiary_id;
            if (entity_id !== '') params.entity_id = entity_id;
            if (internal_id !== '') params.internal_id = internal_id;
            if (gl_from !== '') params.gl_from = gl_from;
            if (gl_to !== '') params.gl_to = gl_to;
            if (type !== '') params.type = type;
            if (tax_item1 !== '') params.tax_item1 = tax_item1;
            //if(tax_item2 != '')     params.tax_item2 = tax_item2;
            if (flag !== '') params.flag = flag;

            window.onbeforeunload = null; // page 이동(새로고침) 시 confirm 메세지 방지
            document.location = url.resolveScript({
                scriptId: getParameterFromURL('script'),
                deploymentId: getParameterFromURL('deploy'),
                params: params
            });
        }

        function getParameterFromURL(param) {
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (pair[0] === param) {
                    return decodeURIComponent(pair[1]);
                }
            }
            return false;
        }

        function settingFieldValue(curUrl, curr_record) {
            const today = new Date();

            // url에서 파라미터 추출
            const subsidiaryId = curUrl.searchParams.get('subsidiary_id');    // 작성회사
            const entity_id = curUrl.searchParams.get('entity_id');        // 거래처명
            const intenal_id = curUrl.searchParams.get('internal_id');      // 문서번호
            const type = curUrl.searchParams.get('type');             // 문서유형
            const tax_item1 = curUrl.searchParams.get('tax_item1');        // 세금계산서 / 계산서
            //const tax_item2    = curUrl.searchParams.get('tax_item2');        // 정발행 / 역발행
            const flag = curUrl.searchParams.get('flag');             // 발행 / 미발행
            const gl_from = curUrl.searchParams.get('gl_from');          // GL From 일자
            const gl_to = curUrl.searchParams.get('gl_to');            // GL To 일자

            //const subsidiary_fd = curr_record.getField('custpage_kor_etax_field_subdiary_id');
            //const type_fd = curr_record.getField('custpage_kor_etax_field_transaction_type');
            const entity_fd = curr_record.getField('custpage_kor_etax_field_entity_id');
            const internal_fd = curr_record.getField('custpage_kor_etax_field_transaction_id');
            const tax_item1_fd = curr_record.getField('custpage_kor_etax_field_invoice_radios');
            //const tax_item2_fd = curr_record.getField('custpage_kor_etax_field_forward_issue_method_radios');
            const flag_fd = curr_record.getField('custpage_kor_etax_field_issue_radios');
            const gl_from_fd = curr_record.getField('custpage_kor_etax_field_gl_date_from');
            const gl_to_fd = curr_record.getField('custpage_kor_etax_field_gl_date_to');
            const tax_date = curr_record.getField('custpage_kor_etax_field_tax_date');

            //if(subsidiaryId!==null) curr_record.setValue(subsidiary_fd.id, subsidiaryId+'');
            //if(type!==null) curr_record.setValue(type_fd.id, type+'');
            if (entity_id !== null) curr_record.setValue(entity_fd.id, entity_id + '');
            if (intenal_id !== null) curr_record.setValue(internal_fd.id, intenal_id + '');
            if (tax_item1 !== null) curr_record.setValue(tax_item1_fd.id, tax_item1 + '');
            //if(tax_item2!==null) curr_record.setValue(tax_item2_fd.id, tax_item2+'');
            if (flag !== null) curr_record.setValue(flag_fd.id, flag + '');
            if (gl_from !== null) {
                const date_from = new Date(gl_from)
                curr_record.setValue(gl_from_fd.id, date_from);
            } else {
                // GL-From date만 초기값이 없으면 해당월 1일 찍기
                const firstDate = new Date(today.getFullYear(), today.getMonth(), 1);
                curr_record.setValue(gl_from_fd.id, firstDate);
            }
            if (gl_to !== null) {
                const date_to = new Date(gl_to)
                curr_record.setValue(gl_to_fd.id, date_to);
            }

            // 서비스/세금일자 placeholder 씌워주기
            const lastDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const ld = 'ex) ' + lastDate.getFullYear() + '/' + (lastDate.getMonth() + 1) + '/' + lastDate.getDate();
            NS.jQuery('#custpage_kor_etax_field_tax_date').attr('placeholder', ld);
        }

        function postBulkSubmitTest() {
            // Hacking DOM
            var array = [];
            var curRecord = currentRecord.get();

            // 작성회사(Subsidiary_id) 필드 V 값 (1)
            var subsidiary_id = curRecord.getValue('custpage_kor_etax_field_subdiary_id');
            // 서비스/세금 일자 필드 TEXT값
            var tax_date = curRecord.getText('custpage_kor_etax_field_tax_date');
            // var tax_date_val = curRecord.getValue('custpage_kor_etax_field_tax_date');
            // log.debug('tax_date -----> ', tax_date , " / tax_date " , typeof tax_date);
            // log.debug('tax_date_val -----> ', tax_date_val , " / tax_date_val " , typeof tax_date_val);

            var tax_date_obj;
            if (tax_date !== '') tax_date_obj = new Date(tax_date);
            /*
                ※ 2020.10.08 오전 수정내역 : TAX_DATE .getValue -> .getText로 변경 후 obj 변수 신설하여 간단한 Validate
                :: getText로 가져와야 사용자가 입력한 필드 일자 그대로를 가져올 수 있음
                */

            /* Getting Checked Row */
            // getting Checked Row Number
            var idNumArr = [];
            var checkedRow = document.getElementsByClassName('checkbox_ck');
            for (var i = 0; i < checkedRow.length; i++) {
                var ckid = checkedRow[i].id; // check'X'_fs
                idNumArr.push(ckid.split('_')[0].substring(5)); // 'X'(Number)
            }

            var checkedRowCnt = 0;
            for (var i in idNumArr) {
                var transaction_id = NS.jQuery('#custpage_fnb_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td.listtexthl.uir-column-large > input[type=hidden]').val();
                var transaction_type = NS.jQuery('#custpage_fnb_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(14)').text();

                var input = {
                    subsidiary_id: subsidiary_id,
                    transaction_id: transaction_id,
                    transaction_type: transaction_type
                }
                array.push(input);
                checkedRowCnt++;
            }

            log.debug('checkedRowCnt -- ', checkedRowCnt);

            // 조건 : 1개 이상의 sublist Row가 선택되고, 서비스/과세 일자 필드가 날짜 형식에 맞을 때
            if (checkedRowCnt > 0 && tax_date_obj instanceof Date) {

                /* 10.20 Map/Reduce 사용안하는 경우만 사용! Status창으로 이동*/
                /* Go to Status Page */
                window.onbeforeunload = null;
                document.location = url.resolveScript({
                    scriptId: 'customscript_e_tax_ll_issue',        
                    deploymentId: 'customdeploy_e_tax_ll_issue',   
                    params: {
                        array: JSON.stringify(array), 
                        rUserId: runtime.getCurrentUser().id,
                        tax_date: tax_date
                    }
                });

            }
            else {
                if (!(checkedRowCnt > 0)) {
                    dialog.alert({title: 'NOTICE', message: '하나 이상의 리스트 행을 선택해주세요.'});
                    return false;
                }
                if (!(tax_date_obj instanceof Date)) {
                    dialog.alert({title: 'NOTICE', message: '서비스/세금 일자를 기재해주세요.'});
                    const tax_date_fd = document.getElementById('custpage_kor_etax_field_tax_date');
                    tax_date_fd.focus();
                    return false;
                }
            }
        }


        // function postBulkSubmitTest() {
        //     log.debug({
        //       title: "postBulkSubmit 버튼 클릭",
        //       details: "--------------- popbill.config 시작---------------"
        //     });
        //     var array = [];
        //     var curRecord = currentRecord.get();

        //     // 작성회사(Subsidiary_id) 필드 V 값 (1)
        //     var subsidiary_id = curRecord.getValue('custpage_kor_etax_field_subdiary_id');

        //     log.debug("postBulkSubmitTest subsidiary_id --- " , subsidiary_id)

        //     // 서비스/과세 일자 필드 TEXT값
        //     // var tax_date = curRecord.getText('custpage_kor_etax_field_tax_date');
        //     // var tax_date_obj;
        //     // if (tax_date !== '') tax_date_obj = new Date(tax_date);

        //     // log.debug("tax_date : " + tax_date + " / typeof tax_date : " + typeof tax_date)
            
        //     // let dates = tax_date.split("/")
        //     // var tax_date_obj = format.format({
        //     //     value: dates[1] + '/' + dates[2] + '/' + dates[0], // mm/dd/yy 형식
        //     //     type: format.Type.DATE,
        //     //     timezone: format.Timezone.ASIA_SEOUL
        //     // });

        //     // log.debug("tax_date_obj : " + tax_date_obj + " ---- typeof tax_date_obj : " + typeof tax_date_obj)
        //     /*
        //      ※ 2020.10.08 오전 수정내역 : TAX_DATE .getValue -> .getText로 변경 후 obj 변수 신설하여 간단한 Validate
        //         :: getText로 가져와야 사용자가 입력한 필드 일자 그대로를 가져올 수 있음
        //      */
            
        //     curRecord.getValue({fieldId: 'custpage_mycheckbox'}); 

        //     /* Getting Checked Row */
        //     // getting Checked Row Number
        //     var idNumArr = [];
        //     var checkedRow = document.getElementsByClassName('checkbox_ck');
        //     for (var i = 0; i < checkedRow.length; i++) {
        //         var ckid = checkedRow[i].id; // check'X'_fs
        //         idNumArr.push(ckid.split('_')[0].substring(5)); // 'X'(Number)
        //     }

        //     var checkedRowCnt = 0;
        //     for (var i in idNumArr) {
        //         var transaction_id = NS.jQuery('#custpage_fnb_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td.listtexthl.uir-column-large > input[type=hidden]').val();
        //         var transaction_type = NS.jQuery('#custpage_fnb_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(14)').text();

        //         var input = {
        //             subsidiary_id: subsidiary_id,
        //             tax_date: "2020/11/01",
        //             // tax_date: tax_date,
        //             transaction_id: transaction_id,
        //             transaction_type: transaction_type
        //         }
        //         array.push(input);
        //         checkedRowCnt++;
        //     }

        //     log.debug("postBulkSubmitTest array : " , array)
        //     log.debug("postBulkSubmitTest checkedRowCnt --- " , checkedRowCnt)



        //     // 조건 : 1개 이상의 sublist Row가 선택되고, 서비스/과세 일자 필드가 날짜 형식에 맞을 때
        //     if (checkedRowCnt > 0 ) {
        //     // if (checkedRowCnt > 0 && tax_date_obj instanceof Date) {

        //         log.debug("리다이렉팅해주는 if문 안" )
        //         log.debug("리다이렉팅해주는 if문 안" )


        //         window.onbeforeunload = null;
        //         document.location = url.resolveScript({
        //             scriptId: 'customscript_e_tax_ll_issue',        
        //             deploymentId: 'customdeploy_e_tax_ll_issue',   
        //             params: {
        //                 array: JSON.stringify(array), /* { subsidiary_id, tax_date, transaction_id, transaction_type } */
        //                 rUserId: runtime.getCurrentUser().id,
        //                 std: tax_date
        //             }
        //         });

                
        //     } else {
        //         if (!(checkedRowCnt > 0)) {
        //             dialog.alert({title: 'NOTICE', message: '하나 이상의 리스트 행을 선택해주세요.'});
        //             return false;
        //         }
        //         // if (!(tax_date_obj instanceof Date)) {
        //         //     dialog.alert({title: 'NOTICE', message: '서비스/세금 일자를 기재해주세요.'});
        //         //     const tax_date_fd = document.getElementById('custpage_kor_etax_field_tax_date');
        //         //     tax_date_fd.focus();
        //         //     return false;
        //         // }
        //     }

        // }
 

        // function doMarkAll() {
        //     // Hacking DOM
        //     NS.jQuery('.checkbox_unck').addClass('checkbox_ck');
        //     NS.jQuery('.checkbox_ck').removeClass('checkbox_unck');
        // }

        // function doUnMarkAll() {
        //     // Hacking DOM
        //     NS.jQuery('.checkbox_ck').addClass('checkbox_unck');
        //     NS.jQuery('.checkbox_unck').removeClass('checkbox_ck');
        // }



        /* ./Custom Client Script */

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            doFind: doFind,
            // doMarkAll: doMarkAll,
            // doUnMarkAll: doUnMarkAll,
            postBulkSubmitTest
        };

    });
