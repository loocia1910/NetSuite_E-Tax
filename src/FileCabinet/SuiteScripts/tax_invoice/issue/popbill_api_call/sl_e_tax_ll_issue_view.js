//-----------------------------------------------------------------------------------------------------------
// Create Date  : 20210112
// Last Updated : 20210112
// Authors      : JHCHO <Wilus Inc.>
// Application  : E-Tax Invoice Issuance Status Check
// Purpose      : Invoice Issuance 필드 및 Grid 등 UI 구성
// Update Desc. : E-TAX (Standard Program) 기준 프로그램 관리 목적의 E-TAX (Standard Program) 프로그램 생성
//-----------------------------------------------------------------------------------------------------------

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/ui/serverWidget'],
    
    (ui) => {

        const entry = (model) => {
            return new View(model);
        }

        function View(model) {
            this.list = createList(model);
        }

        function createList(model) {

            // {"custlist_index":1,
            // "custlist_document_number":"INV-KOR-57",
            // "custlist_transaction_id":"26551",
            // "custlist_customer_name":"CS3-홈플러스",
            // "custlist_net_amount":"167446400.00",
            // "custlist_amount":"152224000.00",
            // "custlist_tax_amount":"15222400.00",
            // "custlist_tax_code":"S-KR",
            // "custlist_service_tax_date":"",
            // "custlist_status":"대기중"}

            log.debug('ll createList model : ', model);

            const list = ui.createList({
                title: '[Wilus] POPBILL 전자세금계산서 발행요청'
            });

            const prefix = "custlist_";

            /* List Column create */
            list.addColumn({
                id: prefix + 'index',
                type: ui.FieldType.INTEGER,
                label: '순번',
                align: ui.LayoutJustification.CENTER
            });
            list.addColumn({
                id: prefix + 'transaction_id',
                type: ui.FieldType.TEXT,
                label: '트랜젝션 번호',
                align: ui.LayoutJustification.CENTER
            });
            list.addColumn({
                id: prefix + 'document_number',
                type: ui.FieldType.TEXT,
                label: '문서번호',
                align: ui.LayoutJustification.CENTER
            });
            list.addColumn({
                id: prefix + 'customer_name',
                type: ui.FieldType.TEXT,
                label: '거래처명',
                align: ui.LayoutJustification.CENTER
            });
            list.addColumn({
                id: prefix + 'net_amount',
                type: ui.FieldType.CURRENCY,
                label: '총금액',
                align: ui.LayoutJustification.RIGHT
            });
            list.addColumn({
                id: prefix + 'amount',
                type: ui.FieldType.CURRENCY,
                label: '과세/비과세대상금액',
                align: ui.LayoutJustification.RIGHT
            });
            list.addColumn({
                id: prefix + 'tax_amount',
                type: ui.FieldType.CURRENCY,
                label: '세액',
                align: ui.LayoutJustification.RIGHT
            });
            list.addColumn({
                id: prefix + 'tax_code',
                type: ui.FieldType.TEXT,
                label: '세목',
                align: ui.LayoutJustification.CENTER
            });
            list.addColumn({
                id: prefix + 'service_tax_date',
                type: ui.FieldType.DATE,
                label: '서비스/세금일자',
                align: ui.LayoutJustification.CENTER
            });


            list.addColumn({
                id: prefix +'popbill_code',
                type: ui.FieldType.TEXT,
                label: '팝빌코드',
                align: ui.LayoutJustification.CENTER
            });
            list.addColumn({
                id: prefix +'popbill_massage',
                type: ui.FieldType.TEXT,
                label: '팝빌상태메시지',
                align: ui.LayoutJustification.CENTER
            });
            
            list.addColumn({
                id: prefix + 'status',
                type: ui.FieldType.TEXT,
                label: '처리상태',
                align: ui.LayoutJustification.CENTER
            });

            list.clientScriptModulePath = './cl_e_tax_ll_issue_sub.js';
            list.addButton({
                id: 'custpage_doBack',
                label: 'Back',
                functionName: 'doBack()'
            });

            // List Value Setting
            if(model.results !== ''){
                list.addRows({rows: model.results});
                list.addButton({
                    id: 'custpage_aggr',
                    label: '팝빌발행요청',
                    functionName: 'postBulkSubmit()'
                })
                .isHidden = true;
            }
            
            return list;
        }

        return { load : entry }

    });
