/**
 * generateReceipt.js — Generate a donation receipt PDF using browser-native print.
 *
 * Creates a professional receipt with transaction details and opens the
 * browser's print dialog (Save as PDF).
 */

/**
 * Generate and download a donation receipt as PDF.
 *
 * @param {Object} params
 * @param {string} params.txHash - Transaction hash.
 * @param {string} params.donorAddress - Donor's wallet address.
 * @param {string} params.ngoName - NGO name.
 * @param {string} params.ngoAddress - NGO wallet address.
 * @param {string|number} params.amount - Donation amount in ETH.
 * @param {string} params.campaignId - Campaign identifier.
 * @param {string} [params.date] - Donation date (defaults to now).
 */
export function generateReceipt({
  txHash,
  donorAddress,
  ngoName,
  ngoAddress,
  amount,
  campaignId,
  date,
}) {
  const receiptDate = date || new Date().toLocaleString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Donation Receipt — ${txHash.slice(0, 10)}...</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f8fafc;
          padding: 40px;
          color: #1e293b;
        }
        .receipt {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 32px;
          text-align: center;
        }
        .header h1 { font-size: 24px; margin-bottom: 4px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .body { padding: 32px; }
        .badge {
          display: inline-block;
          background: #ecfdf5;
          color: #059669;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 24px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .row:last-child { border-bottom: none; }
        .label { color: #64748b; font-size: 14px; }
        .value { font-weight: 600; font-size: 14px; text-align: right; max-width: 60%; word-break: break-all; }
        .amount-row .value { color: #059669; font-size: 20px; }
        .footer {
          text-align: center;
          padding: 20px 32px;
          background: #f8fafc;
          font-size: 12px;
          color: #94a3b8;
        }
        @media print {
          body { padding: 0; background: white; }
          .receipt { box-shadow: none; border-radius: 0; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <h1>Donation Receipt</h1>
          <p>NGO Donation Tracking Platform</p>
        </div>
        <div class="body">
          <div style="text-align: center; margin-bottom: 16px;">
            <span class="badge">✅ Transaction Confirmed</span>
          </div>
          <div class="row amount-row">
            <span class="label">Amount</span>
            <span class="value">${amount} ETH</span>
          </div>
          <div class="row">
            <span class="label">NGO</span>
            <span class="value">${ngoName}</span>
          </div>
          <div class="row">
            <span class="label">NGO Address</span>
            <span class="value" style="font-size:12px;">${ngoAddress}</span>
          </div>
          <div class="row">
            <span class="label">Campaign ID</span>
            <span class="value">${campaignId}</span>
          </div>
          <div class="row">
            <span class="label">Donor Address</span>
            <span class="value" style="font-size:12px;">${donorAddress}</span>
          </div>
          <div class="row">
            <span class="label">Transaction Hash</span>
            <span class="value" style="font-size:11px;">${txHash}</span>
          </div>
          <div class="row">
            <span class="label">Date</span>
            <span class="value">${receiptDate}</span>
          </div>
        </div>
        <div class="footer">
          Verified on Ethereum Blockchain &bull; Powered by Smart Contracts<br/>
          This receipt is auto-generated and does not require a signature.
        </div>
      </div>
    </body>
    </html>
  `;

  // Open print window
  const printWindow = window.open("", "_blank", "width=700,height=900");
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
  printWindow.focus();

  // Auto-trigger print dialog after rendering
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

export default generateReceipt;
