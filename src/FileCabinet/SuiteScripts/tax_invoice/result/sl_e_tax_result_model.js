//-----------------------------------------------------------------------------------------------------------
// Create Date  : 20210112
// Last Updated : 20210112
// Authors      : JHCHO, Wilus Inc.
// Application  : E-Tax CSV File Download
// Purpose      : 이세로 Record 기반 CSV 다운로드 및 취소처리 Business Logic
// Update Desc. : E-TAX (Standard Program) 기준 프로그램 관리 목적의 E-TAX (Standard Program) 프로그램 생성
//-----------------------------------------------------------------------------------------------------------

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/search', 'N/runtime', 'N/record'],
    
    (search, runtime, record) => {

        const entry = (params) => {
            const scriptObj = runtime.getCurrentScript();
            log.debug({title:'Script Start-----------------', details:'Remaining governance units: ' + scriptObj.getRemainingUsage()});
            log.debug({title:'model entry params', details: JSON.stringify(params)});
            return new Model(params);

        }

        function Model(params){
            this.subsId = ScriptValidation().subsId;

            /* Search 객체 및 Page Index만큼 Search결과 출력하기 */
            const eseroSearches = createEseroSearch(params);
            log.debug({title: 'View Search OBJ', details: JSON.stringify(eseroSearches)});

            const es_SearchPage = eseroSearches.runPaged({
                pageSize: PAGE_SIZE
            });
            let pageCount = Math.ceil(es_SearchPage.count / PAGE_SIZE);
            log.debug({title: 'pageCount', details: pageCount});  // 1 Count: 1K

            /* Get Search Data and Setting SubList */
            if (pageCount > 0) {
                // 최초 동작 시 전체 Grid 출력을 막기 위함
                if (params.subsidiary_id != null) {
                    // Get subset of data to be shown on page
                    this.resultArray = fetchSearchResult(es_SearchPage, pageCount);
                    this.pageCount = pageCount;
                }
            }
            /* ./Get Search Data and Setting SubList */
            const scriptObj = runtime.getCurrentScript();
            log.debug({title:'Script End-----------------', details:'Remaining governance units: ' + scriptObj.getRemainingUsage()});
        }

        function createEseroSearch(params) {
            const prefix = 'custrecord_ko_et_';
            let filters = [];
            // 작성회사
            if (params.subsidiary_id != null) {
                if (params.subsidiary_id !== '') { // null : undefined
                    filters.push([prefix + 'subsidiary', search.Operator.IS, params.subsidiary_id + '']);
                    filters.push('and');
                }
            }
            // 거래처명
            if (params.customer_num != null) {
                // null : '' (Untitled)
                if (params.customer_num !== '') {
                    filters.push([prefix + 'customer_num', search.Operator.IS, params.customer_num + '']);
                    filters.push('and');
                }
            }
            // Invoice Type ( 세 / 계 - 정발행만 )
            if (params.tax_code != null) {
                // null : 없음 (Cause. 라디오 버튼)
                if (params.tax_code !== '') {
                    filters.push([prefix + 'tax_item_id', search.Operator.IS, params.tax_code]);
                    filters.push('and');
                }
            }
            // 과세일자 From / To
            log.debug('date', params.tax_date_from + ' , ' + params.tax_date_to)
            if (params.tax_date_from !== undefined) {
                // null : ''
                if (params.tax_date_from !== '') {
                    filters.push([prefix + 'tax_date', search.Operator.ONORAFTER, params.tax_date_from ]);
                    filters.push('and');
                }
            }
            if (params.tax_date_to !== undefined) {
                if (params.tax_date_to !== '') {
                    filters.push([prefix + 'tax_date', search.Operator.ONORBEFORE, params.tax_date_to ]);
                    filters.push('and');
                }
            }
            // 세목(Select List)  (01 세금계산서, 02 영세율, 05 계산서)
            if (params.type != null) {
                // null : '' (Untitled)
                if (params.type !== '') {
                    if(params.type === '01'){
                        // '01' 세금계산서는 '02' 영세율도 포함함
                        filters.push( [[prefix + 'invoice_type', search.Operator.IS, '01'] , 'or', [prefix + 'invoice_type', search.Operator.IS, '02']] );
                        filters.push('and');
                    }else{
                        filters.push([prefix + 'invoice_type', search.Operator.IS, (params.type + '')]);
                        filters.push('and');
                    }

                }
            }
            // 파라미터와 상관없이 Cancel Status가 ''이 아닐땐 가져오기 X
            filters.push( [prefix + 'cancel_status', search.Operator.ISNOT, 'V'] );
            // filters.push('and');
            // filters.pop(); // 마지막 'and' 제거
            log.debug('Filter Details', filters); // 필터정보

            /* transaction_id 를 ASC 하기 위한 컬럼변수 */
            const invocieIdCol = search.createColumn({
                name: prefix + 'invoice_number',
                sort: search.Sort.DESC
            });

            // execution E_TAX_ESERO record search
            return search.create({
                type: search.Type.CUSTOM_RECORD + ES_RECORD_ID,
                columns: [
                    invocieIdCol,
                    prefix + 'tax_rate',
                    prefix + 'subsidiary_contact',
                    prefix + 'customer_num',
                    prefix + 'invoice_type',
                    prefix + 'subsidiary_vatregnumber',
                    prefix + 'subsidiary_legalname',
                    prefix + 'subsidiary_rep',
                    prefix + 'subsidiary_address',
                    prefix + 'subsidiary_category',
                    prefix + 'subsidiary_business_ty',
                    prefix + 'subsidiary_mail',
                    prefix + 'vatregnumber',
                    prefix + 'companyname',
                    prefix + 'representative',
                    prefix + 'defaultaddress',
                    prefix + 'category',
                    prefix + 'businesstype',
                    prefix + 'email1',
                    prefix + 'email2',
                    prefix + 'net_amount',
                    prefix + 'amount',
                    prefix + 'sub_taxday',
                    prefix + 'item_id',
                    prefix + 'issue_type',
                    prefix + 'csv_date',
                    prefix + 'csv_user',
                    prefix + 'tax_date',
                    prefix + 'subsidiary',
                    prefix + 'tax_item_id',
                    prefix + 'net_amount_nontax',
                    prefix + 'payment_status',
                    prefix + 'cancel_status'
                ],
                filters: filters
            });
        }

        function fetchSearchResult(pagedData, pageCount) {
            let returnResults = [];
            const prefix = 'custrecord_ko_et_';

            for(var i=0; i<pageCount; i++){
                const searchPage = pagedData.fetch({ index: i });

                searchPage.data.forEach(function (result) {
                    returnResults.push({
                        invoice_number: result.getValue(prefix + 'invoice_number'),                   // 세금계산서 번호
                        tax_rate: result.getValue(prefix + 'tax_rate'),                               // 세율/세역
                        subsidiary_contact: result.getValue(prefix + 'subsidiary_contact'),           // 공급자 담당자
                        customer_num: result.getValue(prefix + 'customer_num'),                       // 고객 번호
                        invoice_type: result.getValue(prefix + 'invoice_type'),                       // 전자세금계산서 종류
                        subsidiary_vatregnumber: result.getValue(prefix + 'subsidiary_vatregnumber'), // 공급자사업자번호
                        subsidiary_legalname: result.getValue(prefix + 'subsidiary_legalname'),       // 공급자 상호
                        subsidiary_rep: result.getValue(prefix + 'subsidiary_rep'),                   // 대표자
                        subsidiary_address: result.getValue(prefix + 'subsidiary_address'),           // 공급자 사업장 주소
                        subsidiary_category: result.getValue(prefix + 'subsidiary_category'),         // 공급자 업태
                        subsidiary_business_ty: result.getValue(prefix + 'subsidiary_business_ty'),   // 공급자 종목
                        subsidiary_mail: result.getValue(prefix + 'subsidiary_mail'),                 // 공급자 메일
                        vatregnumber: result.getValue(prefix + 'vatregnumber'),                       // 거래처 사업자번호
                        companyname: result.getValue(prefix + 'companyname'),                         // 거래처 상호
                        representative: result.getValue(prefix + 'representative'),                   // 거래처 대표자
                        defaultaddress: result.getValue(prefix + 'defaultaddress'),                   // 거래처 주소
                        category: result.getValue(prefix + 'category'),                               // 거래처 업태
                        businesstype: result.getValue(prefix + 'businesstype'),                       // 거래처 종목
                        email1: result.getValue(prefix + 'email1'),                                   // 거래처 메일1
                        email2: result.getValue(prefix + 'email2'),                                   // 거래처 메일2
                        net_amount: result.getValue(prefix + 'net_amount'),                           // 공급가액
                        amount: result.getValue(prefix + 'amount'),                                   // 세액
                        sub_taxday: result.getValue(prefix + 'sub_taxday'),                           // 과세 일자
                        item_id: result.getValue(prefix + 'item_id'),                                 // 아이템 코드
                        issue_type: result.getValue(prefix + 'issue_type'),                           // 정발행/역발행
                        csv_date: result.getValue(prefix + 'csv_date'),                               // CSV 발행일자
                        csv_user: result.getValue(prefix + 'csv_user'),                               // CSV 발행 사용자
                        tax_date: result.getValue(prefix + 'tax_date'),                               // 서비스/세금 일자
                        subsidiary: result.getValue(prefix + 'subsidiary'),                           // 작성회사
                        tax_item_id: result.getValue(prefix + 'tax_item_id'),                         // 세목
                        net_amount_nontax: result.getValue(prefix + 'net_amount_nontax'),             // 비과세대상 금액
                    });
                });
            }
            return returnResults;
        }

        function ScriptValidation(){
            let scriptExe = false;
            // 현재 사용자의 Subsidiary 판별
            const currUserSubsidiary = runtime.getCurrentUser().subsidiary;
            log.debug('CurrUsers Subsidiary is', currUserSubsidiary);
            const userSub = record.load({
                type: record.Type.SUBSIDIARY,
                id: currUserSubsidiary,
                isDynamic: true
            });
            log.debug('Curr Subsidiary is', userSub.getValue('name'));
            const usl = userSub.getValue('name').toLowerCase();
            const permitSubs = ['wilus group(root)', 'orgenesis korea co.'];

            if( permitSubs.includes(usl.trim()) )
                scriptExe = true;

            return {scriptExe: scriptExe, subsId: currUserSubsidiary};
        }

        return {load:entry}

    });
