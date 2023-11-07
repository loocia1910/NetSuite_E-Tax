//-----------------------------------------------------------------------------------------------------------
// Create Date  : 20210112
// Last Updated : 20210112
// Authors      : JHCHO <Wilus Inc.>
// Application  : E-Tax Issuance Download
// Purpose      : 집계처리 진행결과 페이지 Model(Business Logic) 페이지
// Update Desc. : E-TAX (Standard Program) 기준 프로그램 관리 목적의 E-TAX (Standard Program) 프로그램 생성
//-----------------------------------------------------------------------------------------------------------

/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/url', 'N/record', 'N/search', 'N/runtime', 'N/ui/dialog'],

    function (currentRecord, url, record, search, runtime, dialog) {

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
            document.getElementById("custpage_kor_etax_csv_field_customer_num_popup_new").style.cssText = 'display:none !important';

            // CSV 파일 조작을 위해 SheetJS 라이브러리 Import
            // SheetJS
            AddJavascriptCDN('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.14.3/xlsx.full.min.js', 'head');
            // FileSaver saveAs이용
            AddJavascriptCDN('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/1.3.8/FileSaver.min.js', 'head');
        }

        function AddJavascriptCDN(jsName, pos) {
            var tag = document.getElementsByTagName(pos)[0];
            var addScript = document.createElement('script');
            addScript.setAttribute('src', jsName);
            tag.appendChild(addScript);
        }

        function AddStyle(cssLink, pos) {
            // 외부 CSS 넣는 함수 (부트스트랩 등)
            var tag = document.getElementsByTagName(pos) [0];
            var addLink = document.createElement('link');
            addLink.setAttribute('type', 'text / css');
            addLink.setAttribute('rel', 'stylesheet');
            addLink.setAttribute('href', cssLink);
            tag.appendChild(addLink);
        }

        function fieldChanged(context) {
            // Navigate to selected page
            if (context.fieldId == 'custpage_pageid') {
                var pageId = currentRecord.get().getValue({
                    fieldId: 'custpage_pageid'  // pageid_'x'  x == number
                });
                pageId = parseInt(pageId.split('_')[1]);

                // 현재의 url에서 parameter를 가져옴
                var subsidiary_id = getParameterFromURL('subsidiary_id');
                var entity_id = getParameterFromURL('entity_id');
                var tax_date_from = getParameterFromURL('tax_date_from');
                var tax_date_to = getParameterFromURL('tax_date_to');
                var type = getParameterFromURL('type');
                var tax_code = getParameterFromURL('tax_code');

                var params = {};
                params.page = pageId;
                if (subsidiary_id != '') params.subsidiary_id = subsidiary_id;
                if (entity_id != '') params.entity_id = entity_id;
                if (tax_date_from != '') params.tax_date_from = tax_date_from;
                if (tax_date_to != '') params.tax_date_to = tax_date_to;
                if (type != '') params.type = type;
                if (tax_code != '') params.tax_item1 = tax_code;

                window.onbeforeunload = null;   // page 이동 시 confirm 메세지 방지
                document.location = url.resolveScript({
                    scriptId: getParameterFromURL('script'),
                    deploymentId: getParameterFromURL('deploy'),
                    params: params
                });
            }
        }

        /* ▼ Custom Client Script ▼ */
        function doFind(context) {
            // get data from current record
            var subsidiary_id = currentRecord.get().getValue('custpage_kor_etax_csv_field_subdiary_id');
            var customer_num = currentRecord.get().getValue('custpage_kor_etax_csv_field_customer_num');
            var tax_date_from = currentRecord.get().getText('custpage_kor_etax_csv_field_tax_date_from');
            var tax_date_to = currentRecord.get().getText('custpage_kor_etax_csv_field_tax_date_to');
            var type = currentRecord.get().getValue('custpage_kor_etax_csv_field_invoice_type_radios');
            var tax_code = currentRecord.get().getValue('custpage_kor_etax_csv_field_tax_code');

            // Tax_Date_From 이 To보다 큰 경우
            if (tax_date_from !== '') {
                // 날짜간의 비교는 객체로 진행해주어야 에러가 없음
                var tax_from_date = new Date(tax_date_from);
                var tax_to_date = new Date(tax_date_to);

                if (tax_from_date > tax_to_date) {
                    dialog.alert({
                        title: 'NOTICE',
                        message: 'From 과세 일자보다 이후의 날짜를 입력해주세요.'
                    });
                    // 아래의 DOM조작은 (document) 권장하는 방식이 아닙니다. (ID가 변경될 위험이 있기 때문에)
                    var tax_from_fd = document.getElementById('custpage_kor_etax_csv_field_tax_date_from');
                    tax_from_fd.focus();
                    return false;  // 이후 로직 무시하고 false 리턴
                }
            }

            // Setting Params
            var params = {};
            if (subsidiary_id !== '') params.subsidiary_id = subsidiary_id;
            if (customer_num !== '') params.customer_num = customer_num;
            if (tax_date_from !== '') params.tax_date_from = tax_date_from;
            if (tax_date_to !== '') params.tax_date_to = tax_date_to;
            if (type !== '') params.type = type;
            if (tax_code !== '') params.tax_code = tax_code;

            window.onbeforeunload = null; // page 이동(새로고침) 시 confirm 메세지 방지
            document.location = url.resolveScript({
                scriptId: getParameterFromURL('script'),
                deploymentId: getParameterFromURL('deploy'),
                params: params
            });
        }

        function settingFieldValue(curUrl, curr_record) {
            // url에서 파라미터 추출
            const subsidiaryId = curUrl.searchParams.get('subsidiary_id');  // 작성회사
            const customer_num = curUrl.searchParams.get('customer_num');   // 거래처명
            const type = curUrl.searchParams.get('type');           // 세금계산서 / 계산서
            const tax_code = curUrl.searchParams.get('tax_code');       // 세목
            const tax_date_from = curUrl.searchParams.get('tax_date_from');  // GL From 일자
            const tax_date_to = curUrl.searchParams.get('tax_date_to');    // GL To 일자

            const subsidiary_fd = curr_record.getField('custpage_kor_etax_csv_field_subdiary_id');
            const customer_num_fd = curr_record.getField('custpage_kor_etax_csv_field_customer_num');
            const type_fd = curr_record.getField('custpage_kor_etax_csv_field_invoice_type_radios');
            const tax_code_fd = curr_record.getField('custpage_kor_etax_csv_field_tax_code');
            const tax_from_fd = curr_record.getField('custpage_kor_etax_csv_field_tax_date_from');
            const tax_to_fd = curr_record.getField('custpage_kor_etax_csv_field_tax_date_to');

            if (subsidiaryId !== null) curr_record.setValue(subsidiary_fd.id, subsidiaryId + '');
            if (customer_num !== null) curr_record.setValue(customer_num_fd.id, customer_num + '');
            if (type !== null) curr_record.setValue(type_fd.id, type + '');
            if (tax_code !== null) curr_record.setValue(tax_code_fd.id, tax_code + '');
            if (tax_date_from !== null) {
                const date_from = new Date(tax_date_from)
                curr_record.setValue(tax_from_fd.id, date_from);
            } else {
                // S.T.D From
                const today = new Date();
                const firstday = new Date(today.getFullYear(), today.getMonth(), 1);
                curr_record.setValue(tax_from_fd.id, firstday);
            }
            if (tax_date_to !== null) {
                const date_to = new Date(tax_date_to)
                curr_record.setValue(tax_to_fd.id, date_to);
            }
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

        function xlsExport() {
            var curRecord = currentRecord.get();
            var array = [];

            // 현재 화면에 출력된 Grid의 Record Line 수
            var sublistLineCount = curRecord.getLineCount('custpage_kor_etax_csv_invoice_sublist');

            /* Getting Checked Sublist Row */
            var idNumArr = [];
            var checkedRow = document.getElementsByClassName('checkbox_ck');
            for (var i = 0; i < checkedRow.length; i++) {
                var ckid = checkedRow[i].id; // custpage_csv_check'X'_fs
                idNumArr.push(ckid.split('_')[2].substring(5)); // 'X'(Number)
            }

            var checkedRowCnt = 0;
            var isCsvCnt = 0;
            // 라인 루프 & 조건에 따라 array에 세팅
            for (var i in idNumArr) {

                var inArr = {
                    // #custpage_kor_etax_csv_invoice_sublistrow'X' start Number = 0
                    /*세금계산서 번호*/invoice_number:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(4)').text(),
                    /*서비스/세금일자*/tax_date:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(5)').text(),
                    /*세율/세역*/ tax_rate:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(6)').text(),
                    /*고객번호*/ customer_num:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(7)').text(),
                    /*전자세금계산서종류*/invoice_type:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(8)').text(),
                    /*공급자사업자번호*/ sub_vatregnumber:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(9)').text(),
                    /*공급자 상호*/ sub_legalname:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(10)').text(),
                    /*대표자*/ sub_rep:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(11)').text(),
                    /*공급자사업장주소*/ sub_address:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(12)').text(),
                    /*공급자 업태*/ sub_category:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(13)').text(),
                    /*공급자 종목*/ sub_business_type:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(14)').text(),
                    /*공급자 메일*/ sub_mail:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(15)').text(),
                    /*거래처 사업자번호*/ vatregnumber:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(16)').text(),
                    /*거래처 상호*/ companyname:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(17)').text(),
                    /*거래처 대표자*/ representative:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(18)').text(),
                    /*거래처 주소*/ defaultaddress:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(19)').text(),
                    /*거래처 업태*/ category:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(20)').text(),
                    /*거래처 종목*/ entity_id:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(21)').text(),
                    /*거래처메일1*/ email1:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(22)').text(),
                    /*거래처메일2*/ email2:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(23)').text(),
                    /*공급가액*/ net_amount:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(24)').text(),
                    /*세액*/ amount:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(25)').text(),
                    /*비과세대상금액*/ net_amount_nontax:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(26)').text(),
                    /*아이템코드*/ item_id:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(27)').text(),
                    /*규격1*/ standards:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(28)').text(),
                    /*단위*/ unit:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(29)').text(),
                    /*영수/청구*/ receive_claim:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(30)').text(),
                    /*정발행/역발행*/ issue_type:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(31)').text(),
                    /*정발행/역발행DES*/ issue_type_des:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(32)').text(),
                    /*CSV발행일자*/ csv_date:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(1)').text(),
                    /*CSV발행사용자*/ csv_user:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(2)').text()
                }
                // 공급가액이 0 또는 '' 일때 (=== E-TAX Record가 계산서 일때)
                if (
                    NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(24)').text() === '' ||
                    NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(24)').text() === ' ' ||
                    NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(24)').text() === '0'
                ) {
                    // 비과세대상금액을 공급가액으로
                    /*공급가액*/
                    inArr.net_amount = NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(26)').text()
                }
                // Grid 데이터가 '영수'일 경우 01 / '청구'일 경우 02
                if (inArr.receive_claim === '청구') inArr.receive_claim = '02';
                if (inArr.receive_claim === '영수') inArr.receive_claim = '01';

                if (inArr.csv_date !== '') {
                    // CSV 발행일자가 기재되어있는 경우
                    isCsvCnt++;
                } else {
                    // CSV 발행일자가 기재되어 있지 않은 경우만 저장
                    array.push(inArr);
                }
                checkedRowCnt++;
            }

            // CSV Export 실행
            if (checkedRowCnt > 0) {
                xlsDownload(array, isCsvCnt, checkedRowCnt);
                //csvDataInit(array, isCsvCnt, checkedRowCnt);
            } else {
                dialog.alert({
                    title: 'NOTICE',
                    message: '하나 이상의 리스트 행을 선택해주세요.'
                });
            }

        }

        function xlsDownload(gridData, isCsvCnt, checkedRowCnt) {
            /**
             * 이 Function은 External JavaScript API "sheetJS" 및 "FileSaver"를 사용합니다.
             * CDN Init은 "pageInit"에서 처리합니다.
             * @usingExternalAPI sheetJS, FileSaver
             */

            // Inner Function
            function s2ab(s) {
                var buf = new ArrayBuffer(s.length); //convert s to arrayBuffer
                var view = new Uint8Array(buf);  //create uint8array as viewer
                for (var i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF; //convert to octet
                return buf;
            }

            var pageReload = false;
            var excelData = [];
            var header = [
                /*(10)*/
                {v: "전자(세금)계산서 종류*(01:일반, 02:영세율)", t: 's', z: '@'},
                {v: "작성일자*", t: 's', z: '@'}, {v: "공급자 등록번호*", t: 's', z: '@'}, {v: "공급자 종사업장번호", t: 's', z: '@'},
                {v: "공급자 상호*", t: 's', z: '@'}, {v: "공급자 성명*", t: 's', z: '@'}, {v: "공급자 사업장주소", t: 's', z: '@'},
                {v: "공급자 업태", t: 's', z: '@'}, {v: "공급자 종목", t: 's', z: '@'}, {v: "공급자 이메일", t: 's', z: '@'},
                /*(10)*/
                {v: "공급받는자 등록번호*", t: 's', z: '@'}, {v: "공급받는자 종사업장번호", t: 's', z: '@'}, {
                    v: "공급받는자 상호*",
                    t: 's',
                    z: '@'
                },
                {v: "공급받는자 성명*", t: 's', z: '@'}, {v: "공급받는자 사업장주소", t: 's', z: '@'}, {v: "공급받는자 업태", t: 's', z: '@'},
                {v: "공급받는자 종목", t: 's', z: '@'}, {v: "공급받는자 이메일1", t: 's', z: '@'}, {
                    v: "공급받는자 이메일2",
                    t: 's',
                    z: '@'
                }, {v: "공급가액*", t: 's', z: '@'},
                /*(10)*/
                {v: "세액*", t: 's', z: '@'}, {v: "비고", t: 's', z: '@'}, {v: "일자1*", t: 's', z: '@'}, {
                    v: "품목1",
                    t: 's',
                    z: '@'
                }, {v: "규격1", t: 's', z: '@'},
                {v: "수량1", t: 's', z: '@'}, {v: "단가1", t: 's', z: '@'}, {v: "공급가액1*", t: 's', z: '@'}, {
                    v: "세액1*",
                    t: 's',
                    z: '@'
                }, {v: "품목비고1", t: 's', z: '@'},
                /*(10)*/
                {v: "일자2", t: 's', z: '@'}, {v: "품목2", t: 's', z: '@'}, {v: "규격2", t: 's', z: '@'}, {
                    v: "수량2",
                    t: 's',
                    z: '@'
                }, {v: "단가2", t: 's', z: '@'},
                {v: "공급가액2", t: 's', z: '@'}, {v: "세액2", t: 's', z: '@'}, {v: "품목비고2", t: 's', z: '@'}, {
                    v: "일자3",
                    t: 's',
                    z: '@'
                }, {v: "품목3", t: 's', z: '@'},
                /*(10)*/
                {v: "규격3", t: 's', z: '@'}, {v: "수량3", t: 's', z: '@'}, {v: "단가3", t: 's', z: '@'}, {
                    v: "공급가액3",
                    t: 's',
                    z: '@'
                }, {v: "세액3", t: 's', z: '@'},
                {v: "품목비고3", t: 's', z: '@'}, {v: "일자4", t: 's', z: '@'}, {v: "품목4", t: 's', z: '@'}, {
                    v: "규격4",
                    t: 's',
                    z: '@'
                }, {v: "수량4", t: 's', z: '@'},
                /*( 9)*/
                {v: "단가4", t: 's', z: '@'}, {V: "공급가액4", t: 's', z: '@'}, {v: "세액4", t: 's', z: '@'}, {
                    v: "품목비고4",
                    t: 's',
                    z: '@'
                },
                {v: "현금", t: 's', z: '@'}, {v: "수표", t: 's', z: '@'}, {v: "어음", t: 's', z: '@'}, {
                    v: "외상미수금",
                    t: 's',
                    z: '@'
                }, {v: "영수(01)청구(02)*", t: 's', z: '@'}
            ];
            excelData.push(
                [{v: '엑셀 업로드 양식(전자세금계산서-일반(영세율))', t: 's', z: '@'}],
                [{v: '★*으로 표시된 부분은 필수입력항목으로 반드시 입력하셔야 합니다.', t: 's', z: '@'}],
                [{
                    v: '★실제 업로드할 DATA는 7행부터 입력하여야 합니다. 최대 100건까지 입력이 가능하나, 발급은 최대 10건씩 처리가 됩니다.(100건 초과 자료는 처리 안됨)',
                    t: 's',
                    z: '@'
                }],
                [{v: '★임의로 행을 추가하거나 삭제하는 경우 파일을 제대로 읽지 못하는 경우가 있으므로, 주어진 양식안에 반드시 작성을 하시기 바랍니다.', t: 's', z: '@'}],
                [{v: '★공급받는자 등록번호는 사업자등록번호, 주민등록번호를 입력할 수 있습니다. ', t: 's', z: '@'}]
            );
            excelData.push(header);
            for (var i = 0; i < gridData.length; i++) {
                var arr = gridData[i];
                var ivNum = arr.invoice_number; // Invoice Number가 0번(가장 앞)에 위치함

                // Date matching to Excel
                var td = "";
                var td_day = "";
                var tdArr = (arr.tax_date + '').split('/');
                for (var j = 0; j < tdArr.length; j++) {
                    if (tdArr[j].length === 1) tdArr[j] = '0' + tdArr[j];
                    td += tdArr[j] + '';
                    td_day = tdArr[j] + ''
                }

                // 사업자번호 '-' 제거
                var sub_vatregnumber = (arr.sub_vatregnumber).replace(/-/g, '');
                var vatregnumber = (arr.vatregnumber).replace(/-/g, '');

                var parseExcelArray = [
                    /*(이하 10개)*/
                    {v: (!arr.invoice_type ? undefined : arr.invoice_type + ''), t: 's', z: '@'},
                    {v: (!td ? undefined : td), t: 's', z: '@'},
                    {v: (!sub_vatregnumber ? undefined : sub_vatregnumber + ''), t: 's', z: '@'},
                    {v: undefined, t: 's', z: '@'},
                    {v: (!arr.sub_legalname ? undefined : arr.sub_legalname + ''), t: 's', z: '@'},
                    {v: (!arr.sub_rep ? undefined : arr.sub_rep + ''), t: 's', z: '@'},
                    {v: (!arr.sub_address ? undefined : arr.sub_address + ''), t: 's', z: '@'},
                    {v: (!arr.sub_category ? undefined : arr.sub_category + ''), t: 's', z: '@'},
                    {v: (!arr.sub_business_type ? undefined : arr.sub_business_type + ''), t: 's', z: '@'},
                    {v: (!arr.sub_mail ? undefined : arr.sub_mail + ''), t: 's', z: '@'},
                    /*(이하 10개)*/
                    {v: (!vatregnumber ? undefined : vatregnumber + ''), t: 's', z: '@'},
                    {v: undefined, t: 's', z: '@'},
                    {v: (!arr.companyname ? undefined : arr.companyname + ''), t: 's', z: '@'},
                    {v: (!arr.representative ? undefined : arr.representative + ''), t: 's', z: '@'},
                    {v: (!arr.defaultaddress ? undefined : arr.defaultaddress + ''), t: 's', z: '@'},
                    {v: (!arr.category ? undefined : arr.category + ''), t: 's', z: '@'},
                    {v: (!arr.entity_id ? undefined : arr.entity_id + ''), t: 's', z: '@'},
                    {v: (!arr.email1 ? undefined : arr.email1 + ''), t: 's', z: '@'},
                    {v: (!arr.email2 ? undefined : arr.email2 + ''), t: 's', z: '@'},
                    {v: (!arr.net_amount ? undefined : arr.net_amount + ''), t: 's', z: '@'},
                    /*(이하 10개)*/
                    {v: (!arr.amount ? undefined : arr.amount + ''), t: 's', z: '@'},
                    {v: undefined, t: 's', z: '@'},
                    {v: (!td_day ? undefined : td_day + ''), t: 's', z: '@'},
                    {v: undefined, t: 's', z: '@'},
                    {v: (!arr.standards ? undefined : arr.standards + ''), t: 's', z: '@'},
                    {v: undefined, t: 's', z: '@'},
                    {v: undefined, t: 's', z: '@'},
                    {v: (!arr.net_amount ? undefined : arr.net_amount + ''), t: 's', z: '@'},
                    {v: (!arr.amount ? undefined : arr.amount + ''), t: 's', z: '@'},
                    {v: undefined, t: 's', z: '@'},
                    /*(10)*/
                    {v: undefined, t: 's', z: '@'}, {v: undefined, t: 's', z: '@'}, {v: undefined, t: 's', z: '@'},
                    {v: undefined, t: 's', z: '@'}, {v: undefined, t: 's', z: '@'}, {v: undefined, t: 's', z: '@'},
                    {v: undefined, t: 's', z: '@'}, {v: undefined, t: 's', z: '@'}, {
                        v: undefined,
                        t: 's',
                        z: '@'
                    }, {v: undefined, t: 's', z: '@'},
                    /*(10)*/
                    {v: undefined, t: 's', z: '@'}, {v: undefined, t: 's', z: '@'}, {v: undefined, t: 's', z: '@'},
                    {v: undefined, t: 's', z: '@'}, {v: undefined, t: 's', z: '@'}, {v: undefined, t: 's', z: '@'},
                    {v: undefined, t: 's', z: '@'}, {v: undefined, t: 's', z: '@'}, {
                        v: undefined,
                        t: 's',
                        z: '@'
                    }, {v: undefined, t: 's', z: '@'},
                    /*( 8)*/
                    {v: undefined, t: 's', z: '@'}, {v: undefined, t: 's', z: '@'}, {
                        v: undefined,
                        t: 's',
                        z: '@'
                    }, {v: undefined, t: 's', z: '@'},
                    {v: undefined, t: 's', z: '@'}, {v: undefined, t: 's', z: '@'}, {
                        v: undefined,
                        t: 's',
                        z: '@'
                    }, {v: undefined, t: 's', z: '@'},
                    {v: (!arr.receive_claim ? undefined : arr.receive_claim + ''), t: 's', z: '@'}
                ];
                console.log('발행중입니다... (' + (i + 1) + '/' + gridData.length + ')')
                excelData.push(parseExcelArray);

                /* ETAX ESERO Record Update */
                var eseroSearch = search.create({
                    type: 'customrecord_ko_e_tax_esero',
                    columns: ['internalid'],
                    filters: [
                        ['custrecord_ko_et_invoice_number', search.Operator.IS, ivNum]
                    ]
                });
                var internalid = '';
                eseroSearch.run().each(function (result) {
                    internalid = result.getValue('internalid');
                    return true;
                });

                var todayDate = new Date();
                record.submitFields({
                    type: 'customrecord_ko_e_tax_esero',
                    id: internalid,
                    values: {
                        custrecord_ko_et_csv_date: todayDate,
                        custrecord_ko_et_csv_user: runtime.getCurrentUser().name
                    },
                    options: {
                        ignoreMandatoryFields: true
                    }
                });
            }

            var excelHandler = {
                getExcelFileName: function () {
                    var today = new Date();
                    var tY = today.getFullYear();
                    var tM = today.getMonth() + 1;
                    var tD = today.getDate();
                    return 'etax_issuance_' + tY + '.' + tM + '.' + tD + '.xls';
                },
                getSheetName: function () {
                    return '엑셀업로드양식';
                },
                getExcelData: function () {
                    return excelData;
                },
                getWorksheet: function () {
                    return XLSX.utils.aoa_to_sheet(this.getExcelData());
                }
            }

            // step 1. workbook 생성
            var wb = XLSX.utils.book_new();

            // step 2. 시트 만들기
            var newWorksheet = excelHandler.getWorksheet();

            // step 3. workbook에 새로만든 워크시트에 이름을 주고 붙인다.
            XLSX.utils.book_append_sheet(wb, newWorksheet, excelHandler.getSheetName());

            // step 4. 엑셀 파일 만들기
            var wbout = XLSX.write(wb, {bookType: 'biff8', type: 'binary'});

            // step 5. 엑셀 파일 내보내기
            //saveAs(new Blob([s2ab(wbout)],{type:"application/vnd.ms-excel; charset=utf-8"}), excelHandler.getExcelFileName());

            if (isCsvCnt === 0) {
                // step 5-1. 엑셀 파일 내보내기
                saveAs(new Blob([s2ab(wbout)], {type: "application/vnd.ms-excel; charset=utf-8"}), excelHandler.getExcelFileName());
                dialog.alert({title: 'NOTICE', message: '발행되었습니다.'}).then(reload);

            } else if (isCsvCnt > 0 && isCsvCnt !== checkedRowCnt) {
                // step 5-2. 엑셀 파일 내보내기
                saveAs(new Blob([s2ab(wbout)], {type: "application/vnd.ms-excel; charset=utf-8"}), excelHandler.getExcelFileName());
                dialog.alert({
                    title: 'NOTICE',
                    message: '총 ' + checkedRowCnt + '건의 데이터 중 이미 CSV가 발행된 ' + isCsvCnt + '건을 제외한 ' + (checkedRowCnt - isCsvCnt) + '건을 발행했습니다.'
                }).then(reload);
                pageReload = true;
            } else if (isCsvCnt === checkedRowCnt) {
                dialog.alert({title: 'CAUTION', message: 'CSV가 발행되지 않았습니다.\r\n(원인: 이미 발행된 인보이스가 선택되었음)'}).then(reload);
            }

            // 페이지 새로고침
            function reload() {
                pageReload = true;
                if (pageReload) {
                    window.onbeforeunload = null;
                    document.href = location.reload();
                }
            }

        }

        function csvDelete() {
            // Hacking DOM

            /* Getting Checked Sublist Row */
            var idNumArr = [];
            var checkedRow = document.getElementsByClassName('checkbox_ck');
            for (var i = 0; i < checkedRow.length; i++) {
                var ckid = checkedRow[i].id; // custpage_csv_check'X'_fs
                idNumArr.push(ckid.split('_')[2].substring(5)); // 'X'(Number)
            }

            var checkedRowCnt = 0;
            var isCsvCnt = 0;

            // 라인 루프 & 조건에 따라 array에 세팅
            for (var i = 0; i < idNumArr.length; i++) {
                var input = {
                    /*세금계산서 번호*/
                    invoice_number:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(4)').text(),
                    /*CSV발행일자*/
                    csv_date:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(2)').text(),
                    /*CSV발행사용자*/
                    csv_user:
                        NS.jQuery('#custpage_kor_etax_csv_invoice_sublistrow' + (idNumArr[i] - 1) + ' > td:nth-child(3)').text()
                }
                if (input.csv_date !== '') {
                    isCsvCnt++;

                    /* record Update */
                    var eseroSearches = search.create({
                        type: 'customrecord_ko_e_tax_esero',
                        columns: [
                            'internalid'
                        ],
                        filters: [
                            ['custrecord_ko_et_invoice_number', 'is', input.invoice_number]
                        ]
                    });
                    var internalId = '';
                    eseroSearches.run().each(function (result) {
                        internalId = result.getValue('internalid');
                        return true;
                    });
                    record.submitFields({
                        type: 'customrecord_ko_e_tax_esero',
                        id: internalId,
                        values: {
                            custrecord_ko_et_csv_date: '',
                            custrecord_ko_et_csv_user: '',
                        }
                    });
                    /* record Update End */
                }
                checkedRowCnt++;
            }

            // CSV Delete 실행
            if (checkedRowCnt > 0) {
                if (isCsvCnt > 0) {
                    dialog.alert({title: 'NOTICE', message: isCsvCnt + '건이 발행 취소되었습니다.'}).then(function (result) {
                        window.onbeforeunload = null;
                        document.href = location.reload();
                    });
                } else {
                    dialog.alert({title: 'NOTICE', message: '취소할 인보이스가 없습니다.'});
                }
            } else {
                dialog.alert({title: 'CAUTION', message: '하나 이상의 리스트 행을 선택해주세요.'});
            }
        }

        function editeIssueInvoice() {

        }

        function doMarkAll() {
            // Hacking DOM
            NS.jQuery('.checkbox_unck').addClass('checkbox_ck');
            NS.jQuery('.checkbox_ck').removeClass('checkbox_unck');
        }

        function doUnMarkAll() {
            // Hacking DOM
            NS.jQuery('.checkbox_ck').addClass('checkbox_unck');
            NS.jQuery('.checkbox_unck').removeClass('checkbox_ck');
        }

        /* ./Custom Client Script */

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            doFind: doFind,
            editeIssueInvoice: editeIssueInvoice,
            doMarkAll: doMarkAll,
            doUnMarkAll: doUnMarkAll
            //xlsDownload : xlsDownload
        };

    });
