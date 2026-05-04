export interface ReportData {
  rangeWindow: { startMs: number; endMs: number };
  summary: { totalSales: number; totalPaid: number; totalDue: number; saleCount: number };
  methodMix: Array<{ method: string; amount: number; share: number }>;
  profitSummary: { profit: number; revenue: number };
  profitMargin: number;
  profitSeries: Array<{ day: string; profit: number }>;
  dailyTotals: Array<{ day: string; total_sales: number; sale_count: number }>;
  topItems: Array<{ name: string; total_qty: number; total_sales: number }>;
  topProfitItems: Array<{ name: string; profit: number; total_qty: number }>;
  topCustomers: Array<{ name: string; total_sales: number; sale_count: number }>;
  repeatCustomers: Array<{ name: string; sale_count: number; total_sales: number; last_purchase: number }>;
  deadStockWindow: number;
  deadStock: Array<{ id: string; name: string; stock: number; days: number }>;
  forecast: { window: number; projectedRevenue: number; projectedPaid: number; projectedDue: number } | null;
  comparisonDelta: { totalSales: number; totalPaid: number; totalDue: number } | null;
}

function escapeCsv(value: string | number) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsvSection(title: string, rows: Array<Array<string | number>>) {
  const lines = [escapeCsv(title)];
  rows.forEach((row) => {
    lines.push(row.map(escapeCsv).join(','));
  });
  lines.push('');
  return lines.join('\n');
}

export function buildReportsCsv(data: ReportData) {
  const {
    rangeWindow,
    summary,
    methodMix,
    profitSummary,
    profitMargin,
    profitSeries,
    dailyTotals,
    topItems,
    topProfitItems,
    topCustomers,
    repeatCustomers,
    deadStockWindow,
    deadStock,
    forecast,
    comparisonDelta,
  } = data;

  const rangeLabel = `${new Date(rangeWindow.startMs).toLocaleDateString('en-NG')} - ${new Date(
    rangeWindow.endMs
  ).toLocaleDateString('en-NG')}`;
  const lines: string[] = [];
  lines.push('KudiBase Advanced Report');
  lines.push(`Range,${escapeCsv(rangeLabel)}`);
  lines.push(`Generated,${escapeCsv(new Date().toLocaleString('en-NG'))}`);
  lines.push('');

  lines.push(
    buildCsvSection('Summary', [
      ['Total sales', summary.totalSales],
      ['Total paid', summary.totalPaid],
      ['Total due', summary.totalDue],
      ['Sale count', summary.saleCount],
    ])
  );

  lines.push(
    buildCsvSection('Payment mix', methodMix.map((row) => [row.method, row.amount, `${row.share}%`]))
  );

  lines.push(
    buildCsvSection('Profit snapshot', [
      ['Gross profit', profitSummary.profit],
      ['Revenue', profitSummary.revenue],
      ['Margin %', profitMargin],
    ])
  );

  lines.push(
    buildCsvSection(
      'Profit trend',
      profitSeries.map((row) => [
        new Date(`${row.day}T00:00:00`).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' }),
        row.profit,
      ])
    )
  );

  lines.push(
    buildCsvSection(
      'Sales trend',
      dailyTotals.map((row) => [
        new Date(`${row.day}T00:00:00`).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' }),
        row.total_sales,
        row.sale_count,
      ])
    )
  );

  lines.push(
    buildCsvSection(
      'Top products',
      topItems.map((item) => [item.name, item.total_qty, item.total_sales])
    )
  );

  lines.push(
    buildCsvSection(
      'Top profit items',
      topProfitItems.map((item) => [item.name, item.total_qty, item.profit])
    )
  );

  lines.push(
    buildCsvSection(
      'Top customers',
      topCustomers.map((customer) => [customer.name, customer.sale_count, customer.total_sales])
    )
  );

  lines.push(
    buildCsvSection(
      'Top repeat buyers',
      repeatCustomers.map((customer) => [customer.name, customer.sale_count, customer.total_sales])
    )
  );

  lines.push(
    buildCsvSection(
      `Dead stock (${deadStockWindow} days)`,
      deadStock.map((item) => [item.name, item.stock, item.days >= 999 ? 'Never sold' : `${item.days} days`])
    )
  );

  if (forecast) {
    lines.push(
      buildCsvSection(`Cashflow forecast (${forecast.window} days)`, [
        ['Projected revenue', forecast.projectedRevenue],
        ['Expected cash-in', forecast.projectedPaid],
        ['Likely outstanding', forecast.projectedDue],
      ])
    );
  }

  if (comparisonDelta) {
    lines.push(
      buildCsvSection('Period comparison', [
        ['Sales change', comparisonDelta.totalSales],
        ['Cash in change', comparisonDelta.totalPaid],
        ['Outstanding change', comparisonDelta.totalDue],
      ])
    );
  }

  return lines.join('\n');
}

export function buildReportsHtml(data: ReportData, logoUri: string, formatCurrency: (value: number) => string) {
  const {
    rangeWindow,
    summary,
    methodMix,
    profitSummary,
    profitMargin,
    topItems,
    topProfitItems,
    topCustomers,
    repeatCustomers,
    deadStockWindow,
    deadStock,
    forecast,
  } = data;

  const rangeLabel = `${new Date(rangeWindow.startMs).toLocaleDateString('en-NG')} - ${new Date(
    rangeWindow.endMs
  ).toLocaleDateString('en-NG')}`;

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          :root { color-scheme: light; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; padding: 24px; background: #FFFFFF; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          h2 { font-size: 14px; margin: 20px 0 8px; color: #0F6A3D; }
          .meta { font-size: 12px; color: #6B7280; margin-bottom: 6px; }
          .section { border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 6px 0; border-bottom: 1px solid #F3F4F6; font-size: 12px; }
          th { color: #374151; width: 50%; }
          .tag { font-size: 10px; background: #E5F6ED; color: #0F6A3D; padding: 2px 8px; border-radius: 999px; }
        </style>
      </head>
        <body>
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <img src="${logoUri}" alt="KudiBase" style="width:40px; height:40px; border-radius:10px;" />
            <div>
              <h1 style="margin:0;">KudiBase Advanced Report</h1>
              <div class="meta" style="margin:0;">${new Date().toLocaleString('en-NG')}</div>
            </div>
          </div>
          <div class="meta">Range: ${rangeLabel}</div>

          <div class="section">
            <h2>Summary</h2>
          <table>
            <tr><th>Total sales</th><td>${formatCurrency(summary.totalSales)}</td></tr>
            <tr><th>Total paid</th><td>${formatCurrency(summary.totalPaid)}</td></tr>
            <tr><th>Total due</th><td>${formatCurrency(summary.totalDue)}</td></tr>
            <tr><th>Sale count</th><td>${summary.saleCount}</td></tr>
          </table>
        </div>

        <div class="section">
          <h2>Payment mix</h2>
          <table>
            ${methodMix.map((row) => `<tr><th>${row.method}</th><td>${formatCurrency(row.amount)} (${row.share}%)</td></tr>`).join('')}
          </table>
        </div>

        <div class="section">
          <h2>Profit snapshot</h2>
          <table>
            <tr><th>Gross profit</th><td>${formatCurrency(profitSummary.profit)}</td></tr>
            <tr><th>Revenue</th><td>${formatCurrency(profitSummary.revenue)}</td></tr>
            <tr><th>Margin %</th><td>${profitMargin}%</td></tr>
          </table>
        </div>

        <div class="section">
          <h2>Top profit items</h2>
          <table>
            ${topProfitItems.map((item) => `<tr><th>${item.name}</th><td>${item.total_qty} sold • ${formatCurrency(item.profit)}</td></tr>`).join('')}
          </table>
        </div>

        <div class="section">
          <h2>Top products</h2>
          <table>
            ${topItems.map((item) => `<tr><th>${item.name}</th><td>${item.total_qty} sold • ${formatCurrency(item.total_sales)}</td></tr>`).join('')}
          </table>
        </div>

        <div class="section">
          <h2>Top customers</h2>
          <table>
            ${topCustomers.map((customer) => `<tr><th>${customer.name}</th><td>${customer.sale_count} sales • ${formatCurrency(customer.total_sales)}</td></tr>`).join('')}
          </table>
        </div>

        <div class="section">
          <h2>Top repeat buyers</h2>
          <table>
            ${repeatCustomers.map((customer) => `<tr><th>${customer.name}</th><td>${customer.sale_count} buys • ${formatCurrency(customer.total_sales)}</td></tr>`).join('')}
          </table>
        </div>

        <div class="section">
          <h2>Dead stock <span class="tag">${deadStockWindow} days</span></h2>
          <table>
            ${deadStock.map((item) => `<tr><th>${item.name}</th><td>${item.stock} in stock • ${item.days >= 999 ? 'Never sold' : `${item.days} days`}</td></tr>`).join('')}
          </table>
        </div>

        ${forecast ? `
          <div class="section">
            <h2>Cashflow forecast <span class="tag">${forecast.window} days</span></h2>
            <table>
              <tr><th>Projected revenue</th><td>${formatCurrency(forecast.projectedRevenue)}</td></tr>
              <tr><th>Expected cash-in</th><td>${formatCurrency(forecast.projectedPaid)}</td></tr>
              <tr><th>Likely outstanding</th><td>${formatCurrency(forecast.projectedDue)}</td></tr>
            </table>
          </div>
        ` : ''}
      </body>
    </html>
  `;
}
