//-----------------------------------------------------------------------------------------------------------
// Create Date  : 20210112
// Last Updated : 20220111
// Authors      : JHCHO, Wilus Inc.
// Application  : E-Tax CSV File Download
// Purpose      : 이세로 Record 기반 CSV 다운로드 검색 및 출력 Form UI 구현
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
                    notifyOff: true
                });
            }
            return new View(model)
        }

        function View(model){
            this.form = createForm(model);
        }

        const createForm = (model) => {
            const form = ui.createForm({title: '[Wilus] POPBILL 전자세금계산서 결과 조회'});
            fieldCreate(form, model);
            const sublist = sublistCreate(form);

            // log.debug({title:'arr', details:JSON.stringify(model.resultArray)})
            // Setting value to sublist
            setSublistValue(sublist, model.resultArray)

            form.clientScriptModulePath = './cl_e_tax_result_sub.js';
            form.addButton({
                id: 'custpage_kor_etax_button_find',
                label: '조회',
                functionName: 'doFind()'
            });
            form.addButton({
                id: 'custpage_kor_etax_csv_down_down',
                label: '수정발행',
                functionName: 'editeIssueInvoice()'
            });


            return form;
        }

        function fieldCreate(form, model) {
            //Field Group
            form.addFieldGroup({
                id: 'fldgrp1_id',
                label: 'E-Tax 검색조건'
            });
            form.addFieldGroup({
                id: 'fldgrp2_id',
                label: '인보이스 검색조건'
            });

            /* Field Group .1 */
            //작성회사
            var subsidiary_id_fld = form.addField({
                id: 'custpage_kor_etax_csv_field_subdiary_id',
                type: ui.FieldType.SELECT,
                source: 'subsidiary',
                container: 'fldgrp1_id',
                label: '작성회사'
            });
            subsidiary_id_fld.defaultValue = model.subsId;
            subsidiary_id_fld.updateDisplayType({
                displayType: ui.FieldDisplayType.INLINE
            });

            //거래처명
            form.addField({
                id: 'custpage_kor_etax_csv_field_customer_num',
                type: ui.FieldType.SELECT,
                source: 'customer',
                container: 'fldgrp1_id',
                label: '거래처명'
            });
            //세목
            form.addField({
                id: 'custpage_kor_etax_csv_field_tax_code',
                type: ui.FieldType.SELECT,
                container: 'fldgrp1_id',
                label: '세목',
                source: 'salesTaxItem'
            });
            // 과세 일자
            form.addField({
                id: 'custpage_kor_etax_csv_field_tax_date_from',
                type: ui.FieldType.DATE,
                container: 'fldgrp1_id',
                label: '서비스/세금 일자 From'
            });
            form.addField({
                id: 'custpage_kor_etax_csv_field_tax_date_to',
                type: ui.FieldType.DATE,
                container: 'fldgrp1_id',
                label: '서비스/세금 일자 To'
            });

            //Field Group2
            // 세금계산서/계산서 라디오 버튼
            var invoice_radio_group = form.addField({
                id: 'custpage_kor_etax_csv_field_invoice_radio_group',
                type: ui.FieldType.LABEL,
                container: 'fldgrp2_id',
                label: '계산서 종류'
            });

            var etax_invoice_radio_fld = form.addField({
                id: 'custpage_kor_etax_csv_field_invoice_type_radios',
                type: ui.FieldType.RADIO,
                source: '01',
                container: 'fldgrp2_id',
                label: '세금계산서'
            });
            etax_invoice_radio_fld.defaultValue = '01';
            form.addField({
                id: 'custpage_kor_etax_csv_field_invoice_type_radios',
                type: ui.FieldType.RADIO,
                source: '05',
                container: 'fldgrp2_id',
                label: '계산서'
            });
            invoice_radio_group.updateBreakType({
                breakType: ui.FieldBreakType.STARTCOL
            });

            form.addTab({
                id: 'custpage_kor_etax_csv_tab_id1',
                label: '검색 결과'
            });
        }

        function sublistCreate(form) {
            var sublist = form.addSublist({
                id: 'custpage_kor_etax_csv_invoice_sublist',
                type: ui.SublistType.LIST,
                tab: 'custpage_kor_etax_csv_tab_id1',
                label: 'Invoice Search'
            });
            sublist.addField({
                id: 'custpage_csv_check',
                type: ui.FieldType.CHECKBOX,
                label: 'Check'
            });
            sublist.addField({
                id: 'custpage_csv_csv_date',
                type: ui.FieldType.DATE,
                label: '발행일자'
            });
            sublist.addField({
                id: 'custpage_csv_csv_user',
                type: ui.FieldType.TEXT,
                label: '발행 사용자'
            });
            sublist.addField({
                id: 'custpage_csv_invoice_number',
                type: ui.FieldType.TEXT,
                label: '세금계산서 번호'
            });

            sublist.addField({
                id: 'custpage_csv_tax_date',
                type: ui.FieldType.DATE,
                label: '서비스/세금일자'
            });
            sublist.addField({
                id: 'custpage_csv_tax_rate',
                type: ui.FieldType.FLOAT,
                label: '세율/세역'
            });
            sublist.addField({
                id: 'custpage_csv_customer_num',
                type: ui.FieldType.TEXT,
                label: '고객번호'
            });
            sublist.addField({
                id: 'custpage_csv_invoice_type',
                type: ui.FieldType.TEXT,
                label: '전자세금계산서종류'
            });
            sublist.addField({
                id: 'custpage_csv_sub_vatregnumber',
                type: ui.FieldType.TEXT,
                label: '공급자사업자번호'
            });
            sublist.addField({
                id: 'custpage_csv_sub_legalname',
                type: ui.FieldType.TEXT,
                label: '공급자상호'
            });
            sublist.addField({
                id: 'custpage_csv_sub_rep',
                type: ui.FieldType.TEXT,
                label: '대표자'
            });
            sublist.addField({
                id: 'custpage_csv_sub_address',
                type: ui.FieldType.TEXT,
                label: '공급자 사업장 주소'
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.INLINE
            });
            sublist.addField({
                id: 'custpage_csv_sub_category',
                type: ui.FieldType.TEXT,
                label: '공급자 업태'
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.INLINE
            });
            sublist.addField({
                id: 'custpage_csv_sub_business_type',
                type: ui.FieldType.TEXT,
                label: '공급자 종목'
            });
            sublist.addField({
                id: 'custpage_csv_sub_mail',
                type: ui.FieldType.TEXT,
                label: '공급자 Email'
            });
            sublist.addField({
                id: 'custpage_csv_vatregnumber',
                type: ui.FieldType.TEXT,
                label: '거래처 사업자번호'
            });
            sublist.addField({
                id: 'custpage_csv_companyname',
                type: ui.FieldType.TEXT,
                label: '거래처 상호'
            });
            sublist.addField({
                id: 'custpage_csv_representative',
                type: ui.FieldType.TEXT,
                label: '거래처 대표자'
            });
            sublist.addField({
                id: 'custpage_csv_defaultaddress',
                type: ui.FieldType.TEXT,
                label: '거래처 주소'
            });
            sublist.addField({
                id: 'custpage_csv_category',
                type: ui.FieldType.TEXT,
                label: '거래처 업태'
            });
            sublist.addField({
                id: 'custpage_csv_entity_id',
                type: ui.FieldType.TEXT,
                label: '거래처 종목'
            });
            sublist.addField({
                id: 'custpage_csv_email1',
                type: ui.FieldType.TEXT,
                label: '거래처 Email1'
            });
            sublist.addField({
                id: 'custpage_csv_email2',
                type: ui.FieldType.TEXT,
                label: '거래처 Email2'
            });
            sublist.addField({
                id: 'custpage_csv_net_amount',
                type: ui.FieldType.CURRENCY,
                label: '공급가액'
            });
            sublist.addField({
                id: 'custpage_csv_amount',
                type: ui.FieldType.CURRENCY,
                label: '세액'
            });
            sublist.addField({
                id: 'custpage_csv_net_amount_nontax',
                type: ui.FieldType.CURRENCY,
                label: '비과세대상금액'
            });
            sublist.addField({
                id: 'custpage_csv_item_id',
                type: ui.FieldType.TEXT,
                label: '아이템 코드'
            });
            sublist.addField({
                id: 'custpage_csv_standards',
                type: ui.FieldType.TEXT,
                label: '규격1'
            });
            sublist.addField({
                id: 'custpage_csv_unit',
                type: ui.FieldType.TEXT,
                label: '단위'
            });
            sublist.addField({
                id: 'custpage_csv_receive_claim',
                type: ui.FieldType.TEXT,
                label: '영수/청구'
            });
            sublist.addField({
                id: 'custpage_csv_issue_type',
                type: ui.FieldType.TEXT,
                label: '정발행/역발행'
            }).updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
            sublist.addField({
                id: 'custpage_csv_issue_type_des',
                type: ui.FieldType.TEXT,
                label: '정발행/역발행 DES'
            }).updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});;

            sublist.addButton({
                id: 'custpage_markAll',
                label: 'Mark All',
                functionName: 'doMarkAll'
            });
            sublist.addButton({
                id: 'custpage_unMarkAll',
                label: 'Unmark All',
                functionName: 'doUnMarkAll'
            });
            /* ./서브리스트 생성부 */

            return sublist;
        }

        function setSublistValue(sublist, results) {
            var j = 0;
            if(results){
                for(let result of results){
                    // 세금계산서 번호 / invoice number
                    if (result.invoice_number) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_invoice_number',
                            line: j,
                            value: result.invoice_number + ''
                        });
                    }
                    // 서비스/세금 일자 / tax_date
                    if (result.tax_date) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_tax_date',
                            line: j,
                            value: result.tax_date + ''
                        });
                    }
                    // 세율/세역 / tax_rate
                    if (result.tax_rate) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_tax_rate',
                            line: j,
                            value: result.tax_rate + ''
                        });
                    }
                    // 고객 번호 / customer_num
                    if (result.customer_num) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_customer_num',
                            line: j,
                            value: result.customer_num + ''
                        });
                    }
                    // 전자세금계산서 종류 / invoice_type
                    if (result.invoice_type) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_invoice_type',
                            line: j,
                            value: result.invoice_type + ''
                        });
                    }
                    // 공급자사업자번호 / subsidiary_vatregnumber
                    if (result.subsidiary_vatregnumber) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_sub_vatregnumber',
                            line: j,
                            value: result.subsidiary_vatregnumber + ''
                        });
                    }
                    // 공급자 상호 / subsidiary_legalname
                    if (result.subsidiary_legalname) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_sub_legalname',
                            line: j,
                            value: result.subsidiary_legalname + ''
                        });
                    }
                    // 대표자 / subsidiary_rep
                    if (result.subsidiary_rep) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_sub_rep',
                            line: j,
                            value: result.subsidiary_rep + ''
                        });
                    }
                    // 공급자 사업장 주소 / subsidiary_address
                    if (result.subsidiary_address) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_sub_address',
                            line: j,
                            value: result.subsidiary_address + ''
                        });
                    }
                    // 공급자 업태 / subsidiary_category
                    if (result.subsidiary_category) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_sub_category',
                            line: j,
                            value: result.subsidiary_category + ''
                        });
                    }
                    // 공급자 종목 / subsidiary_business_ty
                    if (result.subsidiary_business_ty) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_sub_business_type',
                            line: j,
                            value: result.subsidiary_business_ty + ''
                        });
                    }
                    // 공급자 Email / subsidiary_mail
                    if (result.subsidiary_mail) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_sub_mail',
                            line: j,
                            value: result.subsidiary_mail + ''
                        });
                    }
                    // 거래처 사업자번호 / vatregnumber
                    if (result.vatregnumber) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_vatregnumber',
                            line: j,
                            value: result.vatregnumber + ''
                        });
                    }
                    // 거래처 상호 / companyname
                    if (result.companyname) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_companyname',
                            line: j,
                            value: result.companyname + ''
                        });
                    }
                    // 거래처 대표자 / representative
                    if (result.representative) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_representative',
                            line: j,
                            value: result.representative + ''
                        });
                    }
                    // 거래처 주소 / defaultaddress
                    if (result.defaultaddress) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_defaultaddress',
                            line: j,
                            value: result.defaultaddress + ''
                        });
                    }
                    // 거래처 업태 / category
                    if (result.category) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_category',
                            line: j,
                            value: result.category + ''
                        });
                    }
                    // 거래처 종목 / entity_id
                    if (result.businesstype) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_entity_id',
                            line: j,
                            value: result.businesstype + ''
                        });
                    }
                    // 거래처 Email1 / email1
                    if (result.email1) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_email1',
                            line: j,
                            value: result.email1 + ''
                        });
                    }
                    // 거래처 Email2 / email2
                    if (result.email2) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_email2',
                            line: j,
                            value: result.email2 + ''
                        });
                    }
                    // 공급가액 / net_amount
                    if (result.net_amount) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_net_amount',
                            line: j,
                            value: result.net_amount + ''
                        });
                    }
                    // 세액 / amount
                    if (result.amount) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_amount',
                            line: j,
                            value: result.amount + ''
                        });
                    }
                    // 비과세대상금액 / net_amount_nontax
                    if (result.net_amount_nontax) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_net_amount_nontax',
                            line: j,
                            value: result.net_amount_nontax + ''
                        });
                    }
                    // 아이템 코드 / item_id
                    if (result.item_id) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_item_id',
                            line: j,
                            value: result.item_id + ''
                        });
                    }
                    /* 규격, 단위, 영수/청구는 Record에 없음 (그치만 무조건 청구 찍을 것)*/
                    // 영수: 01 / 청구: 02
                    sublist.setSublistValue({
                        id: 'custpage_csv_receive_claim',
                        line: j,
                        value: '청구'
                    });
                    // 정발행/역발행 / issue_type
                    if (result.issue_type) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_issue_type',
                            line: j,
                            value: result.issue_type
                        });
                    }
                    // 정발행/역발행 / issue_type Description
                    if (result.issue_type) {
                        let desc = '';
                        switch (parseInt(result.issue_type)) {
                            case 1 : desc = '정발행'; break;
                            case 2 : desc = '역발행'; break;
                            default: desc = '';
                        }
                        sublist.setSublistValue({
                            id: 'custpage_csv_issue_type_des',
                            line: j,
                            value: desc
                        });
                    }
                    // CSV 발행일자 / csv_date
                    if (result.csv_date) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_csv_date',
                            line: j,
                            value: result.csv_date + ''
                        });
                    }
                    // CSV 발행 사용자 / csv_user
                    if (result.csv_user) {
                        sublist.setSublistValue({
                            id: 'custpage_csv_csv_user',
                            line: j,
                            value: result.csv_user + ''
                        });
                    }
                    j++;
                }
            }
        }

        function gridSelectOptionCreate(pageId, pageCount, form, recordLength) {
            var selectOptions = form.addField({
                id: 'custpage_pageid',
                label: 'Page Index',
                container: 'custpage_kor_etax_csv_tab_id1',
                type: ui.FieldType.SELECT
            });
            const recordCnt = ((pageCount - 1) * PAGE_SIZE) + recordLength;

            for (let i = 0; i < pageCount; i++) {
                let text;
                if (i === pageId) {
                    if (i === (pageCount - 1)) text = ((i * PAGE_SIZE) + 1) + ' - ' + ((i * PAGE_SIZE) + recordLength) + ' of ' + recordCnt;
                    else text = ((i * PAGE_SIZE) + 1) + ' - ' + ((i + 1) * PAGE_SIZE) + ' of ' + recordCnt;
                    selectOptions.addSelectOption({
                        value: 'pageid_' + i,
                        text: text,
                        isSelected: true
                    });
                } else {
                    if (i === (pageCount - 1)) text = ((i * PAGE_SIZE) + 1) + ' - ' + ((i * PAGE_SIZE) + recordLength) + ' of ' + recordCnt;
                    else text = ((i * PAGE_SIZE) + 1) + ' - ' + ((i + 1) * PAGE_SIZE) + ' of ' + recordCnt;
                    selectOptions.addSelectOption({
                        value: 'pageid_' + i,
                        text: text
                    });
                }
            }
            return selectOptions;
        }

        return {load:entry}

    });
