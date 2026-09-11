async function handleClientTool(toolName, parameters = {}) {
  console.log("Client Tool çağrıldı:", toolName);
  console.log("Parametreler:", parameters);

  switch (toolName) {
    case "verify_customer":
      return {
        success: true,
        verified: true,
        message: "Kimlik doğrulaması başarıyla tamamlandı."
      };

    case "get_accounts":
      return {
        success: true,
        accounts: [
          {
            account_id: "ACC-DEMO-001",
            account_type: "Vadesiz TL Hesabı",
            currency: "TRY",
            display_name: "Vadesiz TL Hesabı",
            iban_last4: "0001"
          },
          {
            account_id: "ACC-DEMO-002",
            account_type: "Vadeli TL Hesabı",
            currency: "TRY",
            display_name: "Vadeli TL Hesabı",
            iban_last4: "0002"
          }
        ],
        message: "Hesaplar başarıyla getirildi."
      };

    case "get_account_balance":
      if (parameters.account_id === "ACC-DEMO-001") {
        return {
          success: true,
          account_id: "ACC-DEMO-001",
          account_type: "Vadesiz TL Hesabı",
          currency: "TRY",
          available_balance: 25758.50,
          message: "Hesap bakiyesi başarıyla getirildi."
        };
      }

      if (parameters.account_id === "ACC-DEMO-002") {
        return {
          success: true,
          account_id: "ACC-DEMO-002",
          account_type: "Vadeli TL Hesabı",
          currency: "TRY",
          available_balance: 48280.00,
          message: "Hesap bakiyesi başarıyla getirildi."
        };
      }

      return {
        success: false,
        message: "Hesap bulunamadı."
      };

    case "get_account_transactions":
      return {
        success: true,
        account_id: parameters.account_id,
        transactions: [

          {
            transaction_id: "TRX-DEMO-001",
            date: "2026-09-08",
            description: "Maaş ödemesi",
            amount: 35000.00,
            currency: "TRY",
            type: "credit"
          },

          {
            transaction_id: "TRX-DEMO-002",
            date: "2026-09-07",
            description: "Market alışverişi",
            amount: -1250.25,
            currency: "TRY",
            type: "debit"
          },

          {
            transaction_id: "TRX-DEMO-003",
            date: "2026-09-06",
            description: "Elektrik faturası",
            amount: -845.75,
            currency: "TRY",
            type: "debit"
          }
        ],
        message: "Hesap hareketleri başarıyla getirildi."
      };

    case "get_customer_cards":
      return {
        success: true,
        cards: [
          {
            card_id: "CARD-DEMO-001",
            card_type: "Banka Kartı",
            card_name: "Demo Banka Kartı",
            last_four_digits: "1234",
            status: "active"
          },
          
          {
            card_id: "CARD-DEMO-002",
            card_type: "Kredi Kartı",
            card_name: "Demo Kredi Kartı",
            last_four_digits: "5678",
            status: "active"
          }
        ]
      };

    case "get_card_status":
      if (parameters.card_id === "CARD-DEMO-001") {
        return {
          success: true,
          card_id: "CARD-DEMO-001",
          card_type: "Banka Kartı",
          last_four_digits: "1234",
          status: "active",
          message: "Banka kartı aktif durumda."
        };
      }

      if (parameters.card_id === "CARD-DEMO-002") {
        return {
          success: true,
          card_id: "CARD-DEMO-002",
          card_type: "Kredi Kartı",
          last_four_digits: "5678",
          status: "active",
          message: "Kredi kartı aktif durumda."
        };
      }

      return {
        success: false,
        message: "Kart bulunamadı."
      };

    case "get_card_limit":
      if (parameters.card_id === "CARD-DEMO-002") {
        return {
          success: true,
          card_id: "CARD-DEMO-002",
          total_limit: 50000,
          available_limit: 32750.25,
          currency: "TRY",
          message: "Kart limit bilgileri başarıyla getirildi."
        };
      }

      return {
        success: false,
        message: "Kredi kartı bulunamadı veya bu kart için limit bilgisi desteklenmiyor."
      };

    case "get_card_transactions":
      return {
        success: true,
        card_id: parameters.card_id,
        transactions: [
          {
            transaction_id: "CARD-TX-DEMO-001",
            date: "2026-09-08",
            description: "Online alışveriş",
            amount: -1250.50,
            currency: "TRY",
            status: "completed"
          },
          {
            transaction_id: "CARD-TX-DEMO-002",
            date: "2026-09-06",
            description: "Akaryakıt",
            amount: -750.00,
            currency: "TRY",
            status: "completed"
          }
        ],
        message: "Kart hareketleri başarıyla getirildi."
      };

    case "block_card":
      if (
        parameters.card_id === "CARD-DEMO-001" ||
        parameters.card_id === "CARD-DEMO-002"
      ) {
        return {
          success: true,
          card_id: parameters.card_id,
          status: "blocked",
          message: "Kart başarıyla bloke edildi."
        };
      }

      return {
        success: false,
        message: "Kart bulunamadı."
      };

    case "get_credit_card_debt":
      if (parameters.card_id === "CARD-DEMO-002") {
        return {
          success: true,
          card_id: "CARD-DEMO-002",
          current_debt: 17249.75,
          minimum_payment: 3450.00,
          due_date: "2026-09-20",
          currency: "TRY",
          message: "Kredi kartı borç bilgileri başarıyla getirildi."
        };
      }

      return {
        success: false,
        message: "Kredi kartı bulunamadı."
      };

    case "get_credit_limit":
      if (parameters.credit_product_id === "CREDIT-DEMO-001") {
        return {
          success: true,
          credit_product_id: "CREDIT-DEMO-001",
          total_limit: 100000,
          available_limit: 72500,
          currency: "TRY",
          message: "Kredi limit bilgileri başarıyla getirildi."
        };
      }

      return {
        success: false,
        message: "Kredi ürünü bulunamadı."
      };

    case "get_customer_loans":
      return {
        success: true,
        loans: [
          {
            loan_id: "LOAN-DEMO-001",
            loan_type: "İhtiyaç Kredisi",
            remaining_principal: 75000,
            currency: "TRY",
            status: "active"
          }
        ]
      };

    case "get_loan_information":
      if (parameters.loan_id === "LOAN-DEMO-001") {
        return {
          success: true,
          loan_id: "LOAN-DEMO-001",
          loan_type: "İhtiyaç Kredisi",
          remaining_principal: 75000,
          monthly_payment: 6250,
          remaining_installments: 12,
          next_payment_date: "2026-09-15",
          currency: "TRY",
          message: "Kredi bilgileri başarıyla getirildi."
        };
      }

      return {
        success: false,
        message: "Kredi bulunamadı."
      };

    case "get_credit_products":
      return {
        success: true,
        credit_products: [
          {
            credit_product_id: "CREDIT-DEMO-001",
            product_name: "Demo Kredili Ürün",
            product_type: "Kredili Mevduat Hesabı",
            status: "active"
          }
        ]
      };

    case "get_transfer_status":
      if (parameters.transfer_id === "TRX-DEMO-001") {
        return {
          success: true,
          transfer_id: "TRX-DEMO-001",
          status: "completed",
          transfer_type: "FAST",
          amount: 2500,
          currency: "TRY",
          message: "Transfer durumu başarıyla getirildi."
        };
      }

      return {
        success: false,
        message: "Transfer bulunamadı."
      };

    case "create_transfer":
      if (
        !parameters.source_account_id ||
        !parameters.destination ||
        !parameters.amount ||
        !parameters.transfer_type
      ) {
        return {
          success: false,
          message: "Transfer için gerekli bilgiler eksik."
        };
      }

      return {
        success: true,
        transfer_id: "TRX-DEMO-001",
        source_account_id: parameters.source_account_id,
        destination: parameters.destination,
        amount: parameters.amount,
        transfer_type: parameters.transfer_type,
        description: parameters.description || "",
        status: "completed",
        currency: "TRY",
        message: "Transfer başarıyla tamamlandı."
      };

    case "get_payment_status":
      if (parameters.payment_id === "PAY-DEMO-001") {
        return {
          success: true,
          payment_id: "PAY-DEMO-001",
          status: "completed",
          amount: 1250,
          currency: "TRY",
          message: "Ödeme durumu başarıyla getirildi."
        };
      }

      return {
        success: false,
        message: "Ödeme bulunamadı."
      };

    case "create_payment":
      if (
        !parameters.source_account_id ||
        !parameters.amount ||
        !parameters.payment_type
      ) {
        return {
          success: false,
          message: "Ödeme için gerekli bilgiler eksik."
        };
      }

      return {
        success: true,
        payment_id: "PAY-DEMO-001",
        source_account_id: parameters.source_account_id,
        amount: parameters.amount,
        payment_type: parameters.payment_type,
        description: parameters.description || "",
        status: "completed",
        currency: "TRY",
        message: "Ödeme başarıyla tamamlandı."
      };

    case "report_suspicious_transaction":
      if (
        !parameters.transaction_id ||
        !parameters.reason
      ) {
        return {
          success: false,
          message: "Şüpheli işlem bildirimi için gerekli bilgiler eksik."
        };
      }

      return {
        success: true,
        transaction_id: parameters.transaction_id,
        reason: parameters.reason,
        status: "reported",
        message: "Şüpheli işlem bildirimi oluşturuldu."
      };

    case "get_product_information":
      if (parameters.product_id === "PRODUCT-DEMO-001") {
        return {
          success: true,
          product_id: "PRODUCT-DEMO-001",
          product_name: "Demo Kredi Kartı",
          product_type: "Kredi Kartı",
          annual_fee: 0,
          interest_rate: 3.99,
          currency: "TRY",
          message: "Ürün bilgileri başarıyla getirildi."
        };
      }

      return {
        success: false,
        message: "Ürün bulunamadı."
      };

    case "check_campaign_eligibility":
      if (!parameters.campaign_id) {
        return {
          success: false,
          message: "Kampanya bilgisi eksik."
        };
      }

      return {
        success: true,
        campaign_id: parameters.campaign_id,
        eligible: true,
        message: "Müşteri kampanya için uygundur."
      };

    case "start_loan_application":
      if (
        !parameters.loan_type ||
        !parameters.amount ||
        !parameters.installment_count
      ) {
        return {
          success: false,
          message: "Kredi başvurusu için gerekli bilgiler eksik."
        };
      }

      return {
        success: true,
        application_id: "LOAN-APP-DEMO-001",
        loan_type: parameters.loan_type,
        amount: parameters.amount,
        installment_count: parameters.installment_count,
        status: "received",
        message: "Kredi başvurusu alındı."
      };

    case "transfer_to_human":
      if (!parameters.reason) {
        return {
          success: false,
          message: "Aktarım nedeni eksik."
        };
      }

      return {
        success: true,
        status: "transferred",
        reason: parameters.reason,
        summary: parameters.summary || "",
        message: "Görüşme müşteri temsilcisine aktarılıyor."
      };

    default:
      console.log("TANIMSIZ TOOL:", toolName);

      return {
        success: false,
        message: `${toolName} middleware içinde tanımlı değil.`
      };
  }
}

module.exports = {
  handleClientTool
};