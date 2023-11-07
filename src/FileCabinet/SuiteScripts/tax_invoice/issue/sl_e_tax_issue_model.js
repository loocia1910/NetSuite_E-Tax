//-----------------------------------------------------------------------------------------------------------
// Create Date  : 20210112
// Last Updated : 20211008
// Authors      : JHCHO, Wilus Inc.
// Application  : E-Tax Invoice Issuance
// Purpose      : Customer Ledger Record 조회 및 Fetching, TAX_INVOICE_MAPPING Insert 및 집계처리 실시를 위한 Business Logic 구현
// Update Desc. : ZO-KR 비활성화
//-----------------------------------------------------------------------------------------------------------

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/runtime', 'N/search', 'N/record', 'N/task', 'N/error'],
    
    (runtime, search, record, task, error) => {
        const entry = (params, method) => {
            const leftGovernance = runtime.getCurrentScript().getRemainingUsage();
            log.debug({
                title:'Script Start ----------------', 
                details: 'Left Governance: ' + leftGovernance 
            });
            log.debug({
                title:'model entry params', 
                details: JSON.stringify(params)
            });
            if(method === 'GET'){
                return new GetModel(params);
            } else {
                return new PostModel(params);
            }
        }

        class GetModel {
            constructor(params) {
                // Script Executing Validation
                this.subsId = ScriptValidation().subsId;

                /* Search & RecordPage 생성 */
                const clSearches = customerLedgerSearch(params);
                log.debug({ title: 'Customer Ledger searches', details: JSON.stringify(clSearches) });

                // PG_SIZE : 1,000 by STATIC variable in COTROLLER
                const clSearchPage = clSearches.runPaged({ pageSize: PAGE_SIZE });
                let pageCount = Math.ceil(clSearchPage.count / PAGE_SIZE);
                log.debug({ title: 'pageCount', details: pageCount }); // 1 Count: 1K


                /* Search & RecordPage 생성 */
                if (pageCount > 0) {
                    // 최초 동작 시 전체 Grid 출력을 막기 위함
                    if (params.subsidiary_id != null) {

                        // ※ this.xxx : View 단에서 사용할 수 있습니다.
                        this.resultArray = fetchSearchResult(clSearchPage, pageCount); // Get subset of data to be shown on page
                        this.pageCount = pageCount;
                        this.flag = params.flag;
                    }
                }
                const leftGovernance = runtime.getCurrentScript().getRemainingUsage();
                log.debug({ title: 'Script End----------------', details: 'Left Governance: ' + leftGovernance });
            }
        }

        function PostModel(params) {
            const postGettingArray = params.dataArr;
            const userId = params.rUserId;
            const program_id = 'E-Tax Invoice Issuance';

            try{
                /* TODAY Date value converting */
                let today = new Date(); // Today 계산 [표준시간(서버) / 그리니치 시간 / 한국시간]
                let state = "표준시(Server Time): " + today.toLocaleString() + "\n";
                const pcOffset = (today.getTimezoneOffset()/60);

                today.setHours(today.getHours() + pcOffset); state = state + "[GMT]그리니치 표준시: " + today.toLocaleString() + "\n";
                today.setHours(today.getHours() + 9);        state = state + "[KST]한국 표준시: " + today.toLocaleString();
                log.debug({
                    title:'NetSuite Time Conversion', 
                    details: state
                });

                const date_created = new Date(today.toLocaleString());
                const time_created = date_created.getHours() + ':' + date_created.getMinutes() + ':' + date_created.getSeconds();
                /* ./TODAY Date value converting */
``
                /* NEW 'TAX_INVOICE_MAPPING' RECORD Insert */
                const dataArray = JSON.parse(postGettingArray);
                let tax_date;

                // loop dataArrayList.length
                for(let i = 0; i < dataArray.length; i++){
                    tax_date = dataArray[i].tax_date;

                    let tax_inv_mapping = record.create({
                        type: 'customrecord_ko_tax_invoice_mapping',
                        isDynamic: true
                    });
                    tax_inv_mapping.setValue({
                        fieldId: 'custrecord_ko_ti_subsidiary_id',
                        value: dataArray[i].subsidiary_id
                    });
                    tax_inv_mapping.setValue({
                        fieldId: 'custrecord_ko_ti_transaction_id',
                        value: dataArray[i].transaction_id
                    });
                    tax_inv_mapping.setValue({
                        fieldId: 'custrecord_ko_ti_transaction_type',
                        value: dataArray[i].transaction_type
                    });
                    tax_inv_mapping.setValue({
                        fieldId: 'custrecord_ko_ti_date_created',
                        value: date_created
                    });
                    tax_inv_mapping.setValue({
                        fieldId: 'custrecord_ko_ti_program_id',
                        value: program_id
                    });
                    tax_inv_mapping.setValue({
                        fieldId: 'custrecord_ko_ti_time_created',
                        value: time_created
                    });
                    tax_inv_mapping.save();
                }
                /* ./NEW 'TAX_INVOICE_MAPPING' RECORD Insert */

                /* 세금계산서 집계 프로그램 실행 */
                const mapReduceTask = task.create({ taskType : task.TaskType.MAP_REDUCE });
                mapReduceTask.scriptId     = 'customscript_ko_mr_etax_invoice_aggr';
                mapReduceTask.deploymentId = 'customdeploy_ko_mr_etax_invoice_aggr';
                mapReduceTask.params = {
                    custscript_ko_etax_date_created : date_created,
                    custscript_ko_etax_time_created : time_created,
                    //custscript_ko_etax_user : runtime.getCurrentUser().id,
                    custscript_ko_etax_user : userId,
                    custscript_ko_etax_tax_date : tax_date
                };
                const taskId = mapReduceTask.submit();
                log.audit('Map Reduce Task', taskId);
                return taskId;
                /* ./세금계산서 집계 프로그램 실행 */
                // END POST
            }catch (e) {
                // 집계 간 에러 발생한 경우, Client측으로 발생 에러 리턴
                log.error({title: 'mapReduceTask.submit() -> Thrown Error', details: '[' + e.name + '] :: ' + e.type + ' / ' + e.message});
                const err = error.create({
                    name: e.name,
                    message: e.message,
                    notifyOff: true
                });
                throw err;
            }
            const leftGovernance = runtime.getCurrentScript().getRemainingUsage();
            log.debug({title:'Script End----------------', details: 'Left Governance: '+leftGovernance });
        }

        // Func : [GET] Search Record of TRANSACTION
        function customerLedgerSearch(params) {


            log.debug({
                title: "customerLedgerSearch params : ",
                details: params
              });
  

            // SS 0. salesTaxItem Record Search(세목코드; Tax Code)
            // Governance -10
            let taxCode_Map = new Map();
            const tcSearch = search.create({
                type: 'salestaxitem',
                columns: ['itemid', 'internalid'],
                filters: []
            });
            const tcSearchSet = tcSearch.runPaged({ pageSize: 1000 }).fetch({ index: 0 });

            tcSearchSet.data.forEach(function (result) {
                taxCode_Map.set(result.getValue('itemid'), result.getValue('internalid'));
            });
            /*
                세목코드 100개를 조회한 후 taxCode_Map에 <K:name / V:id>로 매핑
                EX. <"S-KR", "9">
                아래 CLsearch의 Filter 조건에 tax_code 관련으로 매핑 할 수 있습니다.
            */

            const prefix = 'custrecord_ko_cl_';
            let filters = [];
            /**
             * @description 10/05자 Filter는 Filter Object 생성 방식이 아닌, Filter Expression(필터표현식)으로 전부 교체하였습니다.
             * Cause : Filter Object가 생성도 편리하고, 오류가 적으나, [세금계산서 정발행 [60, 9]]를 표현할 수 없기 때문
             */

            /* 작성회사 필터 생성 */
            if (params.subsidiary_id != null) {
                if (params.subsidiary_id !== '') {
                    filters.push( [prefix + 'subsidiary_id' , search.Operator.IS, params.subsidiary_id + ''] );
                    filters.push('and');
                }
            }
            /* 문서번호 필터 생성 */
            // transaction_id 말고 document_number로 변경 (09/25)
            if (params.internal_id != null) {
                // null : '' (Untitled)
                if (params.internal_id !== '') {
                    filters.push( [prefix + 'document_number' , search.Operator.IS, params.internal_id + ''] );
                    filters.push('and');
                }
            }
            /* 거래처명 필터 생성 */
            if (params.entity_id != null) {
                // null : '' (Untitled)
                if (params.entity_id !== '') {
                    filters.push( [prefix + 'customer_number' , search.Operator.IS, params.entity_id + ''] );
                    filters.push('and');
                }
            }
            /* 문서유형 필터생성 */
            if (params.type != null) {
                // null : 기본적으로 Invoice가 체크되어있음
                if (params.type !== '') {
                    filters.push( [prefix + 'transaction_type' , search.Operator.IS, params.type + ''] );
                    filters.push('and');
                }
            }
            /* 세목(tax_code) 필터생성 */
            if (params.tax_item1 != null) {
                // null : 없음 (Cause. 라디오 버튼)
                if( params.tax_item1 !== '' && params.tax_item2 !== '') {
                    if (params.tax_item1 === 'etax_invoice') {
                        // 세금계산서 - 정발행
                        filters.push(
                            [
                                [prefix + 'tax_code' , search.Operator.IS, taxCode_Map.get('S-KR')],
                                'or',
                                [prefix + 'tax_code' , search.Operator.IS, taxCode_Map.get('SO-KR')],
                                'or',
                                [prefix + 'tax_code' , search.Operator.IS, taxCode_Map.get('Z-KR')],
                                /*
                                2021-10-08 - JHCHO 수정
                                'or',
                                [prefix + 'tax_code' , search.Operator.IS, taxCode_Map.get('ZO-KR')]*/
                            ]
                        );
                        filters.push('and');
                    } else {
                        // 계산서 - 정발행
                        filters.push(
                            [
                                [prefix + 'tax_code' , search.Operator.IS, taxCode_Map.get('EX-KR')],
                                // 'or',
                                // [prefix + 'tax_code' , search.Operator.IS, taxCode_Map.get('UNDEF_KR')],
                                // 'or',
                                // [prefix + 'tax_code' , search.Operator.IS, taxCode_Map.get('UNDEF-KR')]
                            ]
                        );
                        filters.push('and');
                    }
                }
            }
            /* 발행/미발행 필터 생성 (집계처리되면 T / 아니면 F) */
            if (params.flag != null) {
                if (params.flag !== '') {
                    // null : 없음 (Cause. 라디오 버튼)
                    if (params.flag === 'issue') {
                        // 정발행
                        filters.push( [prefix + 'flag' , search.Operator.IS, 'T'] );
                        filters.push('and');
                    } else {
                        // 역발행
                        filters.push( [prefix + 'flag' , search.Operator.IS, 'F'] );
                        filters.push('and');
                    }
                }
            }
            /* GL일자 필터 생성 */
            if ((params.gl_from != undefined)){
                // null : ''
                if (params.gl_from !== '') {
                    filters.push( [prefix + 'date_tax_point' , search.Operator.ONORAFTER, params.gl_from] );
                    filters.push('and');
                }
            }
            if ((params.gl_to != undefined)){
                if (params.gl_to !== '') {
                    filters.push( [prefix + 'date_tax_point' , search.Operator.ONORBEFORE, params.gl_to] );
                    filters.push('and');
                }
            }
            /* 서비스 과세일자는 필터로 사용되지 않습니다 ~_~ */
            filters.pop(); // 마지막 'and' 제거
            log.debug('Filter Details',filters); // 필터정보Z

            /* transaction_id 를 DESC 하기 위한 컬럼변수 */
            const tranIdCol = search.createColumn({
                name: prefix + 'transaction_id',
                sort: search.Sort.DESC
            });

            // execution Customer_Ledger record search
            return search.create({
                type: search.Type.CUSTOM_RECORD + CL_RECORD_ID,
                columns: [
                    prefix + 'tax_rate',
                    prefix + 'customer_number',
                    prefix + 'customer_name',
                    prefix + 'net_amount',
                    prefix + 'amount',
                    prefix + 'not_tax_amount',
                    prefix + 'tax_amount',
                    prefix + 'tax_code',
                    prefix + 'service_tax_date',
                    prefix + 'invoice_number',
                    prefix + 'department_id',
                    prefix + 'class',
                    prefix + 'location',
                    prefix + 'transaction_type',
                    prefix + 'date_tax_point',
                    prefix + 'subsidiary_id',
                    tranIdCol,  // transaction_id 를 ASC 하기 위한 컬럼변수
                    prefix + 'document_number',
                    prefix + 'memo',
                    prefix + 'posting',
                    prefix + 'flag',
                    prefix + 'item_count'
                ],
                filters: filters
            });
        }

        // Func : [GET] 'TRANSACTION' Record에서 FetchSingle 후 returns{} 변수로 리턴
        function fetchSearchResult(pagedData, pageCount) {
            let results = [];
            let spTransactionIdSet = [];
            const prefix = 'custrecord_ko_cl_';

            // Default Loop Transaction Searches
            for(var i=0; i<pageCount; i++){
                const searchPage = pagedData.fetch({ index: i });

                // setting TRANSACTION_ID in spTransactionIdSet
                searchPage.data.forEach(function (result) { spTransactionIdSet.push(result.getValue(prefix + 'transaction_id')) });
            }

            /* Fetch Single */
            /* 2021.02.05 GBKIM
            * SuiteScript Records Browser_2020_2 변경사항:
            * Transaction 레코드 search column: taxitem --> taxcode
            * 그로 인하여 기존의 taxitem을 taxcode로 변경.
            * */
            const transaction_searches = search.create({
                type: search.Type.TRANSACTION,
                columns: [
                    //'taxitem',          // 세금 계정 코드
                    'taxcode',          // 세금 계정 코드 (21.02.05 수정, 이전 = 'taxitem')
                    'internalid',       // Internal ID
                    'department',       // 사업단위
                    'taxline',          // (filter 용)
                    'rate'              // 세율
                ],
                filters: [
                    ['internalid', 'anyof', spTransactionIdSet],
                    'and',
                    ['taxline', 'is', 'true']
                ]
            });
            log.debug('transaction_searches', JSON.stringify(transaction_searches));


            let tranSearchMap = new Map();
            // Description : taxline = true로 필터를 준 순간 무조건 트랜잭션 라인은 1개만 리턴됩니다.
            const tranSches = transaction_searches.runPaged({pageSize : 1000});
            const tranSchesCnt = Math.ceil(tranSches.count/1000);

            // Setting 'tranSearchSet' Data
            for(var j=0; j<tranSchesCnt; j++){
                tranSches.fetch({index: j}).data.forEach(function (result) {
                    tranSearchMap.set(
                        String(result.getValue('internalid')),
                        {
                            taxcode : result.getText('taxcode'), //(21.02.05 수정, 이전 = taxitem : result.getText('taxitem'), )

                            department : result.getText('department'),
                            rate : result.getValue('rate')
                        }
                    );// Setting Map(internalid, {t,d,r});
                });
            }

            // Final Loop and Fetching Data
            for(var x=0; x<pageCount; x++){
                pagedData.fetch({ index: x }).data.forEach(function (result) {
                    const transaction_id = result.getValue(prefix + 'transaction_id');
                    const tranObj = tranSearchMap.get(transaction_id);

                    /* [2021.02.15]
                     * log.debug("transObj", JSON.stringify(tranObj));
                     * log.debug("transObj is null?", tranObj == null);
                     * CAUSE - tranObj가 Null인 Record가 존재할 시 에러 출력
                     *         (Cannot read property 'taxcode' of undefined)
                     * SOLVE - null 처리 진행
                     */

                    if(tranObj != null){
                        results.push({
                            tax_rate: result.getValue(prefix + 'tax_rate'),
                            customer_number: result.getValue(prefix + 'customer_number'),
                            customer_name: result.getValue(prefix + 'customer_name'),
                            net_amount: result.getValue(prefix + 'net_amount'),
                            amount: result.getValue(prefix + 'amount'),
                            not_tax_amount: result.getValue(prefix + 'not_tax_amount'),
                            tax_amount: result.getValue(prefix + 'tax_amount'),
                            tax_code: tranObj.taxcode,  // 세목코드(TEXT) (21.02.05 수정, 이전: tax_code: tranObj.taxitem, )
                            service_tax_date: result.getValue(prefix + 'service_tax_date'),
                            invoice_number: result.getValue(prefix + 'invoice_number'),
                            department_id: tranObj.department,
                            class_: result.getValue(prefix + 'class'),
                            location: result.getValue(prefix + 'location'),
                            transaction_type: result.getValue(prefix + 'transaction_type'),
                            date_tax_point: result.getValue(prefix + 'date_tax_point'),
                            subsidiary_id: result.getValue(prefix + 'subsidiary_id'),
                            transaction_id: result.getValue(prefix + 'transaction_id'),
                            document_number: result.getValue(prefix + 'document_number'),
                            memo: result.getValue(prefix + 'memo'),
                            posting: result.getValue(prefix + 'posting'),
                            flag: result.getValue(prefix + 'flag'),
                            rate: tranObj.rate,
                            item_count: result.getValue(prefix + 'item_count')
                        });
                    }

                });
            }
            return results;
        }

        function ScriptValidation(){
            let scriptExe = false;
            // 현재 사용자의 Subsidiary 판별
            const subsId = runtime.getCurrentUser().subsidiary;
            log.debug('Fun ScriptValidation - CurrUsers Subsidiary is', subsId);
            const userSub = record.load({
                type: record.Type.SUBSIDIARY,
                id: subsId,
                isDynamic: true
            });
            log.debug('Curr Subsidiary is', userSub.getValue('name'));

            return { subsId };
        }

        return {
            load : entry
        }

    });
