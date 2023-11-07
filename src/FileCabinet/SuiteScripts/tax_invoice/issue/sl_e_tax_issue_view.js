//-----------------------------------------------------------------------------------------------------------
// Create Date  : 20210112
// Last Updated : 20220111
// Authors      : JHCHO, Wilus Inc.
// Application  : E-Tax Invoice Issuance
// Purpose      : Invoice Issuance 필드 및 Grid 등 UI 구성
// Update Desc. : 세율/세역 항목 hide
//-----------------------------------------------------------------------------------------------------------

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/error'],
    
    (ui, error) => {
        const entry = (model) => {
            if(!model){
                log.error({title: 'view Entry', details: 'No model passed'});
                error.create({
                    name: 'Model view entry',
                    message: 'no model passed',
                    notifyOff: 'true'
                });
            }
            return new View(model)
        }

        function View(model){
            this.form = createForm(model);
        }

        function createForm(model){
            const form = ui.createForm({
                title: '[Wilus] POPBILL 전자세금계산서 발행'
            });
            if (!model) return form;

            // Field and Sublist created
            fieldCreate(form, model);
            const sublist = sublistCreate(form);

            setSublistValue(sublist, model.resultArray)

            //if(model.pageCount > 0) gridSelectOptionCreate(model.pageId, model.pageCount, form, model.recordLength, sublist);

            /* Custom Buttons [CLIENT SIDE SCRIPT INSERT] */
            form.clientScriptModulePath = "./cl_e_tax_issue_sub.js";
            form.addButton({
                id: 'custpage_kor_etax_button_find',
                label: 'Find',
                functionName: 'doFind()'
            });

            form.addButton({
                id: 'custpage_kor_etax_button_dopost',
                label: 'popbill 라이브러리 테스트',
                functionName: 'postBulkSubmitTest()'
            });

            // if(model.flag === 'unissue'){
            //     form.addButton({
            //         id: 'custpage_kor_etax_button_dopost',
            //         label: '발행',
            //         functionName: 'doPostTaxInvoice()'
            //     });
            // }

            return form;
        }

        function fieldCreate(form, model) {
            /* 필드 생성부 */
            form.addFieldGroup({
                id: 'fldgrp1_id',
                label: '문서 검색조건'
            });
            form.addFieldGroup({
                id: 'fldgrp2_id',
                label: '인보이스 검색조건'
            });
            form.addFieldGroup({
                id: 'fldgrp3_id',
                label: '발행일자 입력란'
            });
            //작성회사
            let subsidiary_id_fld = form.addField({
                id: 'custpage_kor_etax_field_subdiary_id',
                type: ui.FieldType.SELECT,
                source: 'subsidiary',
                container: 'fldgrp1_id',
                label: '작성회사'
            });
            subsidiary_id_fld.defaultValue = String(model.subsId); // 사용자 Subsidiary_id 참조
            subsidiary_id_fld.updateDisplayType({
                displayType: ui.FieldDisplayType.INLINE
            });
            //주소번호
            form.addField({
                id: 'custpage_kor_etax_field_entity_id',
                type: ui.FieldType.SELECT,
                source: 'customer',
                container: 'fldgrp1_id',
                label: '거래처명'
            });
            // 문서유형
            const transaction_type_fld = form.addField({
                id: 'custpage_kor_etax_field_transaction_type',
                type: ui.FieldType.SELECT,
                container: 'fldgrp1_id',
                label: '문서유형'
            });
            transaction_type_fld.addSelectOption({
                value: 'Invoice',
                text: 'Invoice',
                isSelected: true
            });
            //transaction_type_fld.defaultValue='Invoice';

            transaction_type_fld.updateDisplayType({
                displayType:ui.FieldDisplayType.INLINE
            });
            //문서번호
            // 수정사항 : transaction_id지만 document_id 조회할 것
            form.addField({
                id: 'custpage_kor_etax_field_transaction_id',
                type: ui.FieldType.TEXT,
                container: 'fldgrp1_id',
                label: '문서번호'
            });
            // G/L 일자
            form.addField({
                id: 'custpage_kor_etax_field_gl_date_from',
                type: ui.FieldType.DATE,
                container: 'fldgrp1_id',
                label: 'G/L 일자 From'
            });
            form.addField({
                id: 'custpage_kor_etax_field_gl_date_to',
                type: ui.FieldType.DATE,
                container: 'fldgrp1_id',
                label: 'G/L 일자 To'
            });
            // 세금계산서/계산서 라디오 버튼
            form.addField({
                id: 'custpage_kor_etax_field_invoice_radio_group',
                type: ui.FieldType.LABEL,
                container: 'fldgrp2_id',
                label: '계산서 종류'
            });
            var etax_invoice_radio_fld = form.addField({
                id: 'custpage_kor_etax_field_invoice_radios',
                type: ui.FieldType.RADIO,
                source: 'etax_invoice',
                container: 'fldgrp2_id',
                label: '세금계산서'
            });
            etax_invoice_radio_fld.defaultValue = 'etax_invoice';
            form.addField({
                id: 'custpage_kor_etax_field_invoice_radios',
                type: ui.FieldType.RADIO,
                source: 'invoice',
                container: 'fldgrp2_id',
                label: '계산서'
            });
            // 정발행/역발행 라디오 버튼 (11.03 비활성화 : Orgenesis엔 역발행 없음)
            // form.addField({
            //     id: 'custpage_kor_etax_field_issue_method_radio_group',
            //     type: ui.FieldType.LABEL,
            //     container: 'fldgrp2_id',
            //     label: '발행 종류'
            // });
            // var forward_radio_fld = form.addField({
            //     id: 'custpage_kor_etax_field_forward_issue_method_radios',
            //     type: ui.FieldType.RADIO,
            //     source: 'forward',
            //     container: 'fldgrp2_id',
            //     label: '정발행'
            // });
            // forward_radio_fld.defaultValue = 'forward';
            // form.addField({
            //     id: 'custpage_kor_etax_field_forward_issue_method_radios',
            //     type: ui.FieldType.RADIO,
            //     source: 'backward',
            //     container: 'fldgrp2_id',
            //     label: '역발행'
            // });
            // 발행/미발행 라디오 버튼
            form.addField({
                id: 'custpage_kor_etax_field_issue_radio_group',
                type: ui.FieldType.LABEL,
                container: 'fldgrp2_id',
                label: '집계처리 구분'
            });
            const issue_radio_fld_o = form.addField({
                id: 'custpage_kor_etax_field_issue_radios',
                type: ui.FieldType.RADIO,
                source: 'issue',
                container: 'fldgrp2_id',
                label: '처리'
            });
            const issue_radio_fld_x = form.addField({
                id: 'custpage_kor_etax_field_issue_radios',
                type: ui.FieldType.RADIO,
                source: 'unissue',
                container: 'fldgrp2_id',
                label: '미처리'
            });
            issue_radio_fld_o.defaultValue = 'issue';
            form.addField({
                id: 'custpage_kor_etax_field_disable',
                type: ui.FieldType.LABEL,
                container: 'fldgrp2_id',
                label: ' '
            });
            // 서비스 과세 일자
            let std = form.addField({
                id: 'custpage_kor_etax_field_tax_date',
                type: ui.FieldType.DATE,
                container: 'fldgrp3_id',
                label: '서비스/세금 일자'
            });
            std.isMandatory = true;  // 필수항목

            form.addTab({
                id:'custpage_tab_id1',
                label:'Tab1'
            });
            /* ./필드 생성부 */
        }

        function sublistCreate(form) {
            let sublist = form.addSublist({
                id: 'custpage_fnb_invoice_sublist',
                type: ui.SublistType.STATICLIST,
                tab: 'custpage_tab_id1',
                label: '검색 결과'
            });
            sublist.addField({
                id: 'check',
                type: ui.FieldType.CHECKBOX,
                label: 'Check'
            });
            sublist.addField({
                id: 'transaction_id',
                type: ui.FieldType.TEXT,
                label: '문서번호'
            });
            sublist.addField({
                id: 'entity_id',
                type: ui.FieldType.TEXT,
                label: '주소번호'
            });
            sublist.addField({
                id: 'companyname',
                type: ui.FieldType.TEXT,
                label: '거래처명'
            });
            sublist.addField({
                id: 'net_amount',
                type: ui.FieldType.CURRENCY,
                label: '총금액'
            });
            sublist.addField({
                id: 'vat_net_amount',
                type: ui.FieldType.CURRENCY,
                label: '과세금액'
            });
            sublist.addField({
                id: 'non_vat_net_amount',
                type: ui.FieldType.CURRENCY,
                label: '비과세대상금액'
            });
            sublist.addField({
                id: 'amount',
                type: ui.FieldType.CURRENCY,
                label: '세액'
            });
            sublist.addField({
                id: 'tax_item_id',
                type: ui.FieldType.TEXT,
                label: '세목'
            })
            sublist.addField({
                id: 'rate',
                type: ui.FieldType.PERCENT,
                label: '세율'
            });
            sublist.addField({
                id: 'tax_date',
                type: ui.FieldType.DATE,
                label: '서비스/세금 일자'
            });
            sublist.addField({
                id: 'invoice_number',
                type: ui.FieldType.TEXT,
                label: '세금계산서 번호'
            });
            sublist.addField({
                id: 'department_id',
                type: ui.FieldType.TEXT,
                label: '사업단위'
            });
            sublist.addField({
                id: 'transaction_type',
                type: ui.FieldType.TEXT,
                label: '문서유형'
            });
            sublist.addField({
                id: 'gl_date',
                type: ui.FieldType.DATE,
                label: 'G/L 일자'
            });
            sublist.addField({
                id: 'item_count',
                type: ui.FieldType.INTEGER,
                label: '단위 수'
            });
            sublist.addField({
                id: 'memo',
                type: ui.FieldType.TEXTAREA,
                label: '비고'
            });
            sublist.addField({
                id: 'non_posting_line',
                type: ui.FieldType.TEXT,
                label: '전기코드'
            });
            sublist.addField({
                id: 'flag_code',
                type: ui.FieldType.TEXT,
                label: '집계처리'
            });

            /* E-Tax 집계처리에서 사용될 목적으로 만들어진 컬럼으로, 일반 사용자들에게 보이지 않습니다. */
            let tranid = sublist.addField({
                id: 'tranid',
                type: ui.FieldType.TEXT,
                label: '배치번호'
            });
            tranid.updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN
            });

            sublist.addButton({
                id: 'custMarkAll',
                label: 'Mark All',
                functionName: 'doMarkAll'
            });
            sublist.addButton({
                id: 'custUnMarkAll',
                label: 'Unmark All',
                functionName: 'doUnMarkAll'
            });
            /* ./서브리스트 생성부 */

            return sublist;
        }


        // Func : [GET] Setting value to Sublist
        function setSublistValue(sublist, addResults) {
            let j = 0;

            if(addResults){
                for(let result of addResults) {
                    if (result.customer_number) {
                        sublist.setSublistValue({
                            id: 'entity_id',
                            line: j,
                            value: result.customer_number
                        });
                    }if (result.customer_name) {
                        sublist.setSublistValue({
                            id: 'companyname',
                            line: j,
                            value: result.customer_name
                        });
                    }if (result.net_amount) {
                        sublist.setSublistValue({
                            id: 'net_amount',
                            line: j,
                            value: result.net_amount
                        });
                    }if (result.amount) {
                        sublist.setSublistValue({
                            id: 'vat_net_amount',
                            line: j,
                            value: result.amount
                        });
                    }if (result.not_tax_amount) {
                        sublist.setSublistValue({
                            id: 'non_vat_net_amount',
                            line: j,
                            value: result.not_tax_amount
                        });
                    }if (result.tax_amount) {
                        sublist.setSublistValue({
                            id: 'amount',
                            line: j,
                            value: result.tax_amount
                        });
                    }if (result.tax_code) {
                        sublist.setSublistValue({
                            id: 'tax_item_id',
                            line: j,
                            value: result.tax_code
                        });
                    }if (result.department_id) {
                        sublist.setSublistValue({
                            id: 'department_id',
                            line: j,
                            value: result.department_id
                        });
                    }if (result.transaction_type) {
                        sublist.setSublistValue({
                            id: 'transaction_type',
                            line: j,
                            value: result.transaction_type
                        })
                    }if (result.date_tax_point) {
                        sublist.setSublistValue({
                            id: 'gl_date',
                            line: j,
                            value: result.date_tax_point
                        });
                    }if (result.service_tax_date) {
                        sublist.setSublistValue({
                            id: 'tax_date',
                            line: j,
                            value: result.service_tax_date
                        });
                    }if (result.posting) {
                        sublist.setSublistValue({
                            id: 'non_posting_line',
                            line: j,
                            value: result.posting
                        });
                    }if (result.subsidiary_id) {
                        sublist.setSublistValue({
                            id: 'subsidiary_id',
                            line: j,
                            value: result.subsidiary_id
                        });
                    }// transaction_id 말고 document_number로 변경 (0925)
                    if (result.document_number) {
                        sublist.setSublistValue({
                            id: 'transaction_id', // 컬럼 id는 transaction_id지만 document_number가 Value로 사용됩니다.
                            line: j,
                            value: result.document_number
                        });
                    }// 숨겨진 히든 컬럼 (집계처리에서만 사용됨)
                    if (result.transaction_id) {
                        sublist.setSublistValue({
                            id: 'tranid',
                            line: j,
                            value: result.transaction_id
                        });
                    }if (result.memo) {
                        sublist.setSublistValue({
                            id: 'memo',
                            line: j,
                            value: result.memo
                        });
                    }if (result.class_) {
                        sublist.setSublistValue({
                            id: 'class',
                            line: j,
                            value: result.class_
                        });
                    }if (result.location) {
                        sublist.setSublistValue({
                            id: 'location',
                            line: j,
                            value: result.location
                        });
                    }// ▼ tax_rate 대체
                    if (result.rate) {
                        sublist.setSublistValue({
                            id: 'rate',
                            line: j,
                            value: result.rate
                        });
                    }if (result.invoice_number) {
                        sublist.setSublistValue({
                            id: 'invoice_number',
                            line: j,
                            value: result.invoice_number
                        });
                    }if (result.flag) {
                        sublist.setSublistValue({
                            id: 'flag_code',
                            line: j,
                            value: result.flag
                        });
                    }if (result.item_count) {
                        sublist.setSublistValue({
                            id: 'item_count',
                            line: j,
                            value: result.item_count
                        });
                    }

                    j++;
                }
            }

        }

        return {
            load : entry
        };

    });
