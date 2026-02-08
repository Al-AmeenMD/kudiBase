import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFocusEffect, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrency } from '@/hooks/use-currency';
import {
  getAppSetting,
  getDailySalesTotals,
  getDailyProfitTotals,
  getDeadStockItems,
  getProfitSummary,
  getPayLaterSettlementDurations,
  getSalesList,
  getSalesSummary,
  getTopRepeatCustomers,
  getRecentSalesTotals,
  setAppSetting,
  getTopCustomers,
  getTopProfitItems,
  getTopSellingItems,
  initDb,
} from '@/lib/db';
import { subscribeDbEvents } from '@/lib/db/events';
import { isPremium } from '@/lib/subscription';

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
  });
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' });
}

export default function SalesRecordsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { format } = useCurrency();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [sales, setSales] = useState<
    Array<{
      id: string;
      sale_number: number;
      payment_method: string;
      subtotal: number;
      amount_paid: number;
      balance_due: number;
      customer_name: string | null;
      created_at: number;
    }>
  >([]);
  const [summary, setSummary] = useState({ totalSales: 0, totalPaid: 0, totalDue: 0, saleCount: 0 });
  const [byMethod, setByMethod] = useState<
    Array<{ payment_method: string; total_sales: number; total_paid: number; sale_count: number }>
  >([]);
  const [dailyTotals, setDailyTotals] = useState<Array<{ day: string; total_sales: number; sale_count: number }>>([]);
  const [dailyProfit, setDailyProfit] = useState<Array<{ day: string; profit: number }>>([]);
  const [topItems, setTopItems] = useState<Array<{ name: string; total_qty: number; total_sales: number }>>([]);
  const [profitSummary, setProfitSummary] = useState<{ profit: number; revenue: number }>({
    profit: 0,
    revenue: 0,
  });
  const [topProfitItems, setTopProfitItems] = useState<Array<{ name: string; profit: number; total_qty: number }>>([]);
  const [topCustomers, setTopCustomers] = useState<
    Array<{ name: string; total_sales: number; sale_count: number }>
  >([]);
  const [repeatCustomers, setRepeatCustomers] = useState<
    Array<{ name: string; sale_count: number; total_sales: number; last_purchase: number }>
  >([]);
  const [forecast, setForecast] = useState<{
    window: number;
    projectedRevenue: number;
    projectedPaid: number;
    projectedDue: number;
  } | null>(null);
  const [forecastWindow, setForecastWindow] = useState<7 | 30>(7);
  const [deadStock, setDeadStock] = useState<Array<{ id: string; name: string; stock: number; days: number }>>([]);
  const [deadStockWindow, setDeadStockWindow] = useState<30 | 60 | 90>(30);
  const [comparison, setComparison] = useState<{
    totalSales: number;
    totalPaid: number;
    totalDue: number;
  } | null>(null);
  const [avgDaysToPay, setAvgDaysToPay] = useState<number | null>(null);
  const [showProfitList, setShowProfitList] = useState(false);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Cash' | 'Transfer' | 'POS' | 'Pay Later'>('All');
  const [premium, setPremium] = useState(false);
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const loadSalesRef = useRef(loadSales);

  useEffect(() => {
    loadSalesRef.current = loadSales;
  }, [loadSales]);

  const summaryBlockBasis = width >= 600 ? '31%' : '48%';

  const rangeWindow = useMemo(() => {
    const today = new Date();
    if (range === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { startMs: start.getTime(), endMs: end.getTime() };
    }
    if (range === 'week') {
      const start = new Date();
      const day = start.getDay();
      const diff = (day + 6) % 7;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { startMs: start.getTime(), endMs: end.getTime() };
    }
    if (range === 'month') {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      return { startMs: start.getTime(), endMs: end.getTime() };
    }
    return { startMs: customStart.getTime(), endMs: customEnd.getTime() };
  }, [customEnd, customStart, range]);

  const loadSales = useCallback(async () => {
    await initDb();
    const [rows, summaryData] = await Promise.all([
      getSalesList(200),
      getSalesSummary(rangeWindow.startMs, rangeWindow.endMs),
    ]);
    setSales(rows);
    setSummary({
      totalSales: summaryData.totals.total_sales ?? 0,
      totalPaid: summaryData.totals.total_paid ?? 0,
      totalDue: summaryData.totals.total_due ?? 0,
      saleCount: summaryData.totals.sale_count ?? 0,
    });
    setByMethod(
      summaryData.byMethod.map((row) => ({
        payment_method: row.payment_method,
        total_sales: row.total_sales ?? 0,
        total_paid: row.total_paid ?? 0,
        sale_count: row.sale_count ?? 0,
      }))
    );
    let premiumStatus = false;
    try {
      premiumStatus = await isPremium();
    } catch {
      premiumStatus = false;
    }
    setPremium(premiumStatus);
    if (premiumStatus) {
      const rangeDuration = rangeWindow.endMs - rangeWindow.startMs;
      const prevStart = rangeWindow.startMs - rangeDuration;
      const prevEnd = rangeWindow.endMs - rangeDuration;
      const [
        daily,
        items,
        customers,
        prevSummary,
        payDurations,
        profit,
        profitItems,
        profitTrend,
        deadStockRows,
        repeatRows,
        recent7,
        recent30,
      ] =
        await Promise.all([
        getDailySalesTotals(rangeWindow.startMs, rangeWindow.endMs),
        getTopSellingItems(rangeWindow.startMs, rangeWindow.endMs, 5),
        getTopCustomers(rangeWindow.startMs, rangeWindow.endMs, 5),
        getSalesSummary(prevStart, prevEnd),
        getPayLaterSettlementDurations(rangeWindow.startMs, rangeWindow.endMs),
        getProfitSummary(rangeWindow.startMs, rangeWindow.endMs),
        getTopProfitItems(rangeWindow.startMs, rangeWindow.endMs, 5),
        getDailyProfitTotals(rangeWindow.startMs, rangeWindow.endMs),
        getDeadStockItems(Date.now() - 1000 * 60 * 60 * 24 * deadStockWindow, 8),
        getTopRepeatCustomers(rangeWindow.startMs, rangeWindow.endMs, 5),
        getRecentSalesTotals(7),
        getRecentSalesTotals(30),
      ]);
      setDailyTotals(
        daily.map((row) => ({
          day: row.day,
          total_sales: row.total_sales ?? 0,
          sale_count: row.sale_count ?? 0,
        }))
      );
      setDailyProfit(
        profitTrend.map((row) => ({
          day: row.day,
          profit: row.profit ?? 0,
        }))
      );
      setTopItems(
        items.map((row) => ({
          name: row.name,
          total_qty: row.total_qty ?? 0,
          total_sales: row.total_sales ?? 0,
        }))
      );
      setProfitSummary({
        profit: profit.profit ?? 0,
        revenue: profit.revenue ?? 0,
      });
      setTopProfitItems(
        profitItems.map((row) => ({
          name: row.name,
          profit: row.profit ?? 0,
          total_qty: row.total_qty ?? 0,
        }))
      );
      setTopCustomers(
        customers.map((row) => ({
          name: row.customer_name,
          total_sales: row.total_sales ?? 0,
          sale_count: row.sale_count ?? 0,
        }))
      );
      setComparison({
        totalSales: prevSummary.totals.total_sales ?? 0,
        totalPaid: prevSummary.totals.total_paid ?? 0,
        totalDue: prevSummary.totals.total_due ?? 0,
      });
      if (payDurations.length === 0) {
        setAvgDaysToPay(null);
      } else {
        const avgMs =
          payDurations.reduce((sum, row) => sum + (row.last_payment - row.created_at), 0) /
          payDurations.length;
        setAvgDaysToPay(Math.max(1, Math.round(avgMs / (1000 * 60 * 60 * 24))));
      }
      setRepeatCustomers(
        repeatRows.map((row) => ({
          name: row.customer_name,
          sale_count: row.sale_count ?? 0,
          total_sales: row.total_sales ?? 0,
          last_purchase: row.last_purchase ?? 0,
        }))
      );
      const useWindow = forecastWindow;
      const recent = useWindow === 30 ? recent30 : recent7;
      const factor = useWindow;
      setForecast({
        window: useWindow,
        projectedRevenue: Math.round((recent.revenue ?? 0) * factor),
        projectedPaid: Math.round((recent.paid ?? 0) * factor),
        projectedDue: Math.round((recent.due ?? 0) * factor),
      });
      const now = Date.now();
      setDeadStock(
        deadStockRows.map((row) => ({
          id: row.id,
          name: row.name,
          stock: row.stock_qty,
          days: row.last_sold_at ? Math.floor((now - row.last_sold_at) / (1000 * 60 * 60 * 24)) : 999,
        }))
      );
    } else {
      setDailyTotals([]);
      setDailyProfit([]);
      setTopItems([]);
      setProfitSummary({ profit: 0, revenue: 0 });
      setTopProfitItems([]);
      setTopCustomers([]);
      setComparison(null);
      setAvgDaysToPay(null);
      setDeadStock([]);
      setRepeatCustomers([]);
      setForecast(null);
    }
  }, [deadStockWindow, forecastWindow, rangeWindow.endMs, rangeWindow.startMs]);

  useEffect(() => {
    loadSales().catch((error) => {
      Alert.alert('Load error', 'Unable to load sales records.');
      console.error(error);
    });
  }, [loadSales]);

  useEffect(() => {
    getAppSetting('show_profit_list')
      .then((value) => {
        if (value === 'true' || value === 'false') {
          setShowProfitList(value === 'true');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    getAppSetting('forecast_window')
      .then((value) => {
        if (value === '7' || value === '30') {
          setForecastWindow(Number(value) as 7 | 30);
        }
      })
      .catch(() => {});
  }, []);


  useFocusEffect(
    useCallback(() => {
      loadSales().catch((error) => {
        Alert.alert('Load error', 'Unable to refresh sales records.');
        console.error(error);
      });
    }, [loadSales])
  );

  useEffect(() => {
    const unsubscribe = subscribeDbEvents((event) => {
      if (event !== 'sales') return;
      loadSalesRef.current?.().catch(() => {});
    });
    return unsubscribe;
  }, []);

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = sales;
    list = list.filter((row) => row.created_at >= rangeWindow.startMs && row.created_at <= rangeWindow.endMs);
    if (filter !== 'All') {
      list = list.filter((row) => row.payment_method === filter);
    }
    if (term) {
      list = list.filter((row) => {
        const numberMatch = String(row.sale_number).includes(term);
        const methodMatch = row.payment_method.toLowerCase().includes(term);
        const nameMatch = row.customer_name?.toLowerCase().includes(term);
        return numberMatch || methodMatch || Boolean(nameMatch);
      });
    }
    return list;
  }, [filter, rangeWindow.endMs, rangeWindow.startMs, sales, search]);

  const averageOrder = useMemo(() => {
    if (summary.saleCount === 0) {
      return 0;
    }
    return Math.round(summary.totalSales / summary.saleCount);
  }, [summary.saleCount, summary.totalSales]);

  const collectionRate = useMemo(() => {
    if (summary.totalSales === 0) {
      return 0;
    }
    return Math.round((summary.totalPaid / summary.totalSales) * 100);
  }, [summary.totalPaid, summary.totalSales]);

  const profitMargin = useMemo(() => {
    if (profitSummary.revenue === 0) {
      return 0;
    }
    return Math.round((profitSummary.profit / profitSummary.revenue) * 100);
  }, [profitSummary.profit, profitSummary.revenue]);

  const profitMax = useMemo(() => {
    if (dailyProfit.length === 0) {
      return 0;
    }
    return dailyProfit.reduce((max, row) => Math.max(max, Math.abs(row.profit)), 0);
  }, [dailyProfit]);

  const profitSeries = useMemo(() => {
    if (rangeWindow.startMs > rangeWindow.endMs) {
      return [];
    }
    const series: Array<{ day: string; profit: number }> = [];
    const profitMap = new Map(dailyProfit.map((row) => [row.day, row.profit]));
    const cursor = new Date(rangeWindow.startMs);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(rangeWindow.endMs);
    end.setHours(0, 0, 0, 0);
    while (cursor.getTime() <= end.getTime()) {
      const key = cursor.toISOString().slice(0, 10);
      series.push({ day: key, profit: profitMap.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return series;
  }, [dailyProfit, rangeWindow.endMs, rangeWindow.startMs]);

  const comparisonDelta = useMemo(() => {
    if (!comparison) {
      return null;
    }
    return {
      totalSales: summary.totalSales - comparison.totalSales,
      totalPaid: summary.totalPaid - comparison.totalPaid,
      totalDue: summary.totalDue - comparison.totalDue,
    };
  }, [comparison, summary.totalPaid, summary.totalDue, summary.totalSales]);

  const methodMix = useMemo(() => {
    if (summary.totalSales === 0) {
      return [];
    }
    return byMethod
      .filter((row) => row.total_sales > 0)
      .map((row) => ({
        method: row.payment_method,
        amount: row.total_sales,
        share: Math.round((row.total_sales / summary.totalSales) * 100),
      }));
  }, [byMethod, summary.totalSales]);

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

  function buildReportsCsv() {
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

  async function handleExportCsv() {
    try {
      setExporting('csv');
      const csv = buildReportsCsv();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const path = `${FileSystem.documentDirectory}kudibase-report-${timestamp}.csv`;
      await FileSystem.writeAsStringAsync(path, csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { dialogTitle: 'Export KudiBase report' });
      } else {
        Alert.alert('Export saved', 'Report saved to device.');
      }
    } catch (error) {
      Alert.alert('Export failed', 'Unable to export report.');
      console.error(error);
    } finally {
      setExporting(null);
    }
  }

  function buildReportsHtml() {
    const rangeLabel = `${new Date(rangeWindow.startMs).toLocaleDateString('en-NG')} - ${new Date(
      rangeWindow.endMs
    ).toLocaleDateString('en-NG')}`;
    const logoUri = Image.resolveAssetSource(
      require('@/assets/images/kudibase_logo.png')
    ).uri;
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
              <tr><th>Total sales</th><td>${format(summary.totalSales)}</td></tr>
              <tr><th>Total paid</th><td>${format(summary.totalPaid)}</td></tr>
              <tr><th>Total due</th><td>${format(summary.totalDue)}</td></tr>
              <tr><th>Sale count</th><td>${summary.saleCount}</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Payment mix</h2>
            <table>
              ${methodMix.map((row) => `<tr><th>${row.method}</th><td>${format(row.amount)} (${row.share}%)</td></tr>`).join('')}
            </table>
          </div>

          <div class="section">
            <h2>Profit snapshot</h2>
            <table>
              <tr><th>Gross profit</th><td>${format(profitSummary.profit)}</td></tr>
              <tr><th>Revenue</th><td>${format(profitSummary.revenue)}</td></tr>
              <tr><th>Margin %</th><td>${profitMargin}%</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Top profit items</h2>
            <table>
              ${topProfitItems.map((item) => `<tr><th>${item.name}</th><td>${item.total_qty} sold • ${format(item.profit)}</td></tr>`).join('')}
            </table>
          </div>

          <div class="section">
            <h2>Top products</h2>
            <table>
              ${topItems.map((item) => `<tr><th>${item.name}</th><td>${item.total_qty} sold • ${format(item.total_sales)}</td></tr>`).join('')}
            </table>
          </div>

          <div class="section">
            <h2>Top customers</h2>
            <table>
              ${topCustomers.map((customer) => `<tr><th>${customer.name}</th><td>${customer.sale_count} sales • ${format(customer.total_sales)}</td></tr>`).join('')}
            </table>
          </div>

          <div class="section">
            <h2>Top repeat buyers</h2>
            <table>
              ${repeatCustomers.map((customer) => `<tr><th>${customer.name}</th><td>${customer.sale_count} buys • ${format(customer.total_sales)}</td></tr>`).join('')}
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
                <tr><th>Projected revenue</th><td>${format(forecast.projectedRevenue)}</td></tr>
                <tr><th>Expected cash-in</th><td>${format(forecast.projectedPaid)}</td></tr>
                <tr><th>Likely outstanding</th><td>${format(forecast.projectedDue)}</td></tr>
              </table>
            </div>
          ` : ''}
        </body>
      </html>
    `;
  }

  async function handleExportPdf() {
    try {
      setExporting('pdf');
      const html = buildReportsHtml();
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: 'Export KudiBase report (PDF)' });
      } else {
        Alert.alert('Export saved', 'PDF saved to device.');
      }
    } catch (error) {
      Alert.alert('Export failed', 'Unable to export PDF.');
      console.error(error);
    } finally {
      setExporting(null);
    }
  }


  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ThemedText type="title">Sales records</ThemedText>
          <ThemedText style={[styles.caption, { color: theme.muted }]}>
            Track every transaction and payment method.
          </ThemedText>
        </View>
        <View style={[styles.summaryCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.rangeRow}>
            {(['today', 'week', 'month', 'custom'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setRange(value)}
                style={[
                  styles.rangeChip,
                  {
                    backgroundColor: range === value ? theme.primary : theme.surface,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText style={{ color: range === value ? '#FFFFFF' : theme.text }}>
                  {value === 'today'
                    ? 'Today'
                    : value === 'week'
                      ? 'This week'
                      : value === 'month'
                        ? 'This month'
                        : 'Custom'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {range === 'custom' && (
            <View style={styles.customRangeRow}>
              <Pressable
                onPress={() => setShowStartPicker(true)}
                style={[styles.dateChip, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <ThemedText style={styles.dateText}>From {formatDateLabel(customStart)}</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setShowEndPicker(true)}
                style={[styles.dateChip, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <ThemedText style={styles.dateText}>To {formatDateLabel(customEnd)}</ThemedText>
              </Pressable>
            </View>
          )}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryBlock, { flexBasis: summaryBlockBasis }]}>
              <ThemedText style={[styles.summaryLabel, { color: theme.muted }]}>Total sales</ThemedText>
              <ThemedText
                style={styles.summaryValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}>
                {format(summary.totalSales)}
              </ThemedText>
              <ThemedText style={[styles.summaryMeta, { color: theme.muted }]}>
                {summary.saleCount} transactions
              </ThemedText>
            </View>
            <View style={[styles.summaryBlock, { flexBasis: summaryBlockBasis }]}>
              <ThemedText style={[styles.summaryLabel, { color: theme.muted }]}>Cash in</ThemedText>
              <ThemedText
                style={styles.summaryValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}>
                {format(summary.totalPaid)}
              </ThemedText>
              <ThemedText style={[styles.summaryMeta, { color: theme.muted }]}>Collected</ThemedText>
            </View>
            <View style={[styles.summaryBlock, { flexBasis: summaryBlockBasis }]}>
              <ThemedText style={[styles.summaryLabel, { color: theme.muted }]}>Outstanding</ThemedText>
              <ThemedText
                style={styles.summaryValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}>
                {format(summary.totalDue)}
              </ThemedText>
              <ThemedText style={[styles.summaryMeta, { color: theme.muted }]}>Pay later</ThemedText>
            </View>
          </View>
        </View>

        {!premium ? (
          <View style={[styles.lockCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={styles.lockRow}>
              <View>
                <ThemedText style={styles.lockTitle}>Advanced reports</ThemedText>
                <ThemedText style={[styles.lockSubtitle, { color: theme.muted }]}>
                  Profit, trends, and product performance.
                </ThemedText>
              </View>
              <View style={styles.lockActions}>
                <IconSymbol name="crown.fill" size={18} color={theme.primaryDeep} />
                <Pressable
                  onPress={() => router.push('/premium')}
                  style={[styles.lockButton, { borderColor: theme.border }]}>
                  <ThemedText style={styles.lockButtonText}>Unlock</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.advancedSection}>
            <ThemedText type="subtitle">Advanced reports</ThemedText>
            <View style={[styles.advancedCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={styles.exportRow}>
                <View>
                  <ThemedText style={styles.advancedTitle}>Export report</ThemedText>
                  <ThemedText style={[styles.advancedMeta, { color: theme.muted }]}>
                    Download your advanced analytics.
                  </ThemedText>
                </View>
                <View style={styles.exportActions}>
                  <Pressable
                    onPress={handleExportCsv}
                    disabled={exporting === 'csv'}
                    style={[styles.exportButton, { backgroundColor: theme.primary }]}>
                    <ThemedText style={styles.exportButtonText}>
                      {exporting === 'csv' ? 'Working...' : 'CSV'}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleExportPdf}
                    disabled={exporting === 'pdf'}
                    style={[styles.exportButtonOutline, { borderColor: theme.border }]}>
                    <ThemedText style={[styles.exportOutlineText, { color: theme.text }]}>PDF</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
            <View style={[styles.advancedCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <ThemedText style={styles.advancedTitle}>Profit snapshot</ThemedText>
              <View style={styles.advancedRow}>
                <View style={styles.advancedBlock}>
                  <ThemedText style={[styles.advancedLabel, { color: theme.muted }]}>Gross profit</ThemedText>
                  <ThemedText style={styles.advancedValue}>{format(profitSummary.profit)}</ThemedText>
                </View>
                <View style={styles.advancedBlock}>
                  <ThemedText style={[styles.advancedLabel, { color: theme.muted }]}>Margin</ThemedText>
                  <ThemedText style={styles.advancedValue}>{profitMargin}%</ThemedText>
                </View>
              </View>
              <View style={[styles.advancedDivider, { borderTopColor: theme.border }]} />
              <View style={styles.advancedList}>
                <ThemedText style={styles.advancedTitle}>Top profit items</ThemedText>
                {topProfitItems.length === 0 ? (
                  <ThemedText style={[styles.advancedMeta, { color: theme.muted }]}>
                    Add item cost to see profit leaders.
                  </ThemedText>
                ) : (
                  topProfitItems.map((item) => (
                    <View key={item.name} style={styles.advancedListRow}>
                      <ThemedText style={styles.advancedListLabel}>{item.name}</ThemedText>
                      <ThemedText style={styles.advancedListValue}>
                        {format(item.profit)} • {item.total_qty} sold
                      </ThemedText>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={[styles.advancedCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={styles.advancedRow}>
                <View style={styles.advancedBlock}>
                  <ThemedText style={[styles.advancedLabel, { color: theme.muted }]}>Avg order</ThemedText>
                  <ThemedText style={styles.advancedValue}>{format(averageOrder)}</ThemedText>
                </View>
                <View style={styles.advancedBlock}>
                  <ThemedText style={[styles.advancedLabel, { color: theme.muted }]}>
                    Collection rate
                  </ThemedText>
                  <ThemedText style={styles.advancedValue}>{collectionRate}%</ThemedText>
                </View>
                <View style={styles.advancedBlock}>
                  <ThemedText style={[styles.advancedLabel, { color: theme.muted }]}>
                    Avg days to pay
                  </ThemedText>
                  <ThemedText style={styles.advancedValue}>
                    {avgDaysToPay ? `${avgDaysToPay} days` : '—'}
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.advancedDivider, { borderTopColor: theme.border }]} />
              <View style={styles.advancedList}>
                <ThemedText style={styles.advancedTitle}>Payment mix</ThemedText>
                {methodMix.length === 0 ? (
                  <ThemedText style={[styles.advancedMeta, { color: theme.muted }]}>
                    No payment data yet.
                  </ThemedText>
                ) : (
                  methodMix.map((row) => (
                    <View key={row.method} style={styles.advancedListRow}>
                      <ThemedText style={styles.advancedListLabel}>{row.method}</ThemedText>
                      <ThemedText style={styles.advancedListValue}>
                        {format(row.amount)} • {row.share}%
                      </ThemedText>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={[styles.advancedCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <ThemedText style={styles.advancedTitle}>Period comparison</ThemedText>
              {comparisonDelta ? (
                <>
                  <View style={styles.advancedListRow}>
                    <ThemedText style={styles.advancedListLabel}>Sales change</ThemedText>
                    <ThemedText style={styles.advancedListValue}>
                      {comparisonDelta.totalSales >= 0 ? '+' : '-'}
                      {format(Math.abs(comparisonDelta.totalSales))}
                    </ThemedText>
                  </View>
                  <View style={styles.advancedListRow}>
                    <ThemedText style={styles.advancedListLabel}>Cash in change</ThemedText>
                    <ThemedText style={styles.advancedListValue}>
                      {comparisonDelta.totalPaid >= 0 ? '+' : '-'}
                      {format(Math.abs(comparisonDelta.totalPaid))}
                    </ThemedText>
                  </View>
                  <View style={styles.advancedListRow}>
                    <ThemedText style={styles.advancedListLabel}>Outstanding change</ThemedText>
                    <ThemedText style={styles.advancedListValue}>
                      {comparisonDelta.totalDue >= 0 ? '+' : '-'}
                      {format(Math.abs(comparisonDelta.totalDue))}
                    </ThemedText>
                  </View>
                </>
              ) : (
                <ThemedText style={[styles.advancedMeta, { color: theme.muted }]}>
                  Not enough data for comparison.
                </ThemedText>
              )}
            </View>

            <View style={[styles.advancedCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <ThemedText style={styles.advancedTitle}>Sales trend</ThemedText>
              {dailyTotals.length === 0 ? (
                <ThemedText style={[styles.advancedMeta, { color: theme.muted }]}>
                  No trends yet.
                </ThemedText>
              ) : (
                dailyTotals.map((row) => (
                  <View key={row.day} style={styles.advancedListRow}>
                    <ThemedText style={styles.advancedListLabel}>
                      {new Date(`${row.day}T00:00:00`).toLocaleDateString('en-NG', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </ThemedText>
                    <ThemedText style={styles.advancedListValue}>
                      {format(row.total_sales)} • {row.sale_count} sales
                    </ThemedText>
                  </View>
                ))
              )}
            </View>

            <View style={[styles.advancedCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={styles.advancedHeaderRow}>
                <ThemedText style={styles.advancedTitle}>Profit trend</ThemedText>
                <View style={styles.toggleRow}>
                  <ThemedText style={[styles.toggleLabel, { color: theme.muted }]}>Show list</ThemedText>
                  <Switch
                    value={showProfitList}
                    onValueChange={(value) => {
                      setShowProfitList(value);
                      setAppSetting('show_profit_list', value ? 'true' : 'false').catch(() => {});
                    }}
                    trackColor={{ true: theme.primary, false: theme.border }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
              {profitSeries.length === 0 ? (
                <ThemedText style={[styles.advancedMeta, { color: theme.muted }]}>
                  No profit data yet.
                </ThemedText>
              ) : (
                <>
                  <View style={[styles.sparkline, { borderColor: theme.border }]}>
                    {profitSeries.map((row) => {
                      const height = profitMax
                        ? Math.max(4, (Math.abs(row.profit) / profitMax) * 44)
                        : 4;
                      const color = row.profit >= 0 ? theme.primary : theme.accent;
                      const barWidth = profitSeries.length > 20 ? 4 : 6;
                      return (
                        <View key={row.day} style={styles.sparkBarWrapper}>
                          <View
                            style={[
                              styles.sparkBar,
                              { height, backgroundColor: color, width: barWidth },
                            ]}
                          />
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.sparklineLegend}>
                    <ThemedText style={[styles.advancedMeta, { color: theme.muted }]}>
                      {new Date(`${profitSeries[0]?.day ?? ''}T00:00:00`).toLocaleDateString('en-NG', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </ThemedText>
                    <ThemedText style={[styles.advancedMeta, { color: theme.muted }]}>
                      {new Date(
                        `${profitSeries[profitSeries.length - 1]?.day ?? ''}T00:00:00`
                      ).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}
                    </ThemedText>
                  </View>
                  {showProfitList ? (
                    profitSeries.map((row) => (
                      <View key={`${row.day}-row`} style={styles.advancedListRow}>
                        <ThemedText style={styles.advancedListLabel}>
                          {new Date(`${row.day}T00:00:00`).toLocaleDateString('en-NG', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </ThemedText>
                        <ThemedText style={styles.advancedListValue}>{format(row.profit)}</ThemedText>
                      </View>
                    ))
                  ) : null}
                </>
              )}
            </View>

            <View style={[styles.advancedCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <ThemedText style={styles.advancedTitle}>Top products</ThemedText>
              {topItems.length === 0 ? (
                <ThemedText style={[styles.advancedMeta, { color: theme.muted }]}>
                  No items sold yet.
                </ThemedText>
              ) : (
                topItems.map((item) => (
                  <View key={item.name} style={styles.advancedListRow}>
                    <ThemedText style={styles.advancedListLabel}>{item.name}</ThemedText>
                    <ThemedText style={styles.advancedListValue}>
                      {item.total_qty} sold • {format(item.total_sales)}
                    </ThemedText>
                  </View>
                ))
              )}
            </View>

            <View style={[styles.advancedCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <ThemedText style={styles.advancedTitle}>Top customers</ThemedText>
              {topCustomers.length === 0 ? (
                <ThemedText style={[styles.advancedMeta, { color: theme.muted }]}>
                  No customer data yet.
                </ThemedText>
              ) : (
                topCustomers.map((customer) => (
                  <View key={customer.name} style={styles.advancedListRow}>
                    <ThemedText style={styles.advancedListLabel}>
                      {customer.name}
                    </ThemedText>
                    <ThemedText style={styles.advancedListValue}>
                      {format(customer.total_sales)} • {customer.sale_count} sales
                    </ThemedText>
                  </View>
                ))
              )}
            </View>

            <View style={[styles.advancedCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <ThemedText style={styles.advancedTitle}>Top repeat buyers</ThemedText>
              {repeatCustomers.length === 0 ? (
                <ThemedText style={[styles.advancedMeta, { color: theme.muted }]}>
                  No repeat buyers yet.
                </ThemedText>
              ) : (
                repeatCustomers.map((customer) => (
                  <View key={customer.name} style={styles.advancedListRow}>
                    <ThemedText style={styles.advancedListLabel}>{customer.name}</ThemedText>
                    <ThemedText style={styles.advancedListValue}>
                      {customer.sale_count} buys • {format(customer.total_sales)}
                    </ThemedText>
                  </View>
                ))
              )}
            </View>

            <View style={[styles.advancedCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={styles.advancedHeaderRow}>
                <ThemedText style={styles.advancedTitle}>Cashflow forecast</ThemedText>
                <View style={styles.pillRow}>
                  {[7, 30].map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => {
                        setForecastWindow(value as 7 | 30);
                        setAppSetting('forecast_window', String(value)).catch(() => {});
                      }}
                      style={[
                        styles.pillChip,
                        {
                          backgroundColor: forecastWindow === value ? theme.primary : theme.surface,
                          borderColor: theme.border,
                        },
                      ]}>
                      <ThemedText
                        style={{
                          color: forecastWindow === value ? '#FFFFFF' : theme.text,
                          fontSize: 12,
                        }}>
                        {value}d
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
              {forecast ? (
                <>
                  <View style={styles.advancedListRow}>
                    <ThemedText style={styles.advancedListLabel}>Projected revenue</ThemedText>
                    <ThemedText style={styles.advancedListValue}>
                      {format(forecast.projectedRevenue)}
                    </ThemedText>
                  </View>
                  <View style={styles.advancedListRow}>
                    <ThemedText style={styles.advancedListLabel}>Expected cash-in</ThemedText>
                    <ThemedText style={styles.advancedListValue}>
                      {format(forecast.projectedPaid)}
                    </ThemedText>
                  </View>
                  <View style={styles.advancedListRow}>
                    <ThemedText style={styles.advancedListLabel}>Likely outstanding</ThemedText>
                    <ThemedText style={styles.advancedListValue}>
                      {format(forecast.projectedDue)}
                    </ThemedText>
                  </View>
                </>
              ) : (
                <ThemedText style={[styles.advancedMeta, { color: theme.muted }]}>
                  Not enough data to forecast yet.
                </ThemedText>
              )}
            </View>

            <View style={[styles.advancedCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={styles.advancedHeaderRow}>
                <ThemedText style={styles.advancedTitle}>Dead stock</ThemedText>
                <View style={styles.pillRow}>
                  {[30, 60, 90].map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setDeadStockWindow(value as 30 | 60 | 90)}
                      style={[
                        styles.pillChip,
                        {
                          backgroundColor: deadStockWindow === value ? theme.primary : theme.surface,
                          borderColor: theme.border,
                        },
                      ]}>
                      <ThemedText
                        style={{
                          color: deadStockWindow === value ? '#FFFFFF' : theme.text,
                          fontSize: 12,
                        }}>
                        {value}d
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
              {deadStock.length === 0 ? (
                <ThemedText style={[styles.advancedMeta, { color: theme.muted }]}>
                  No stale inventory detected.
                </ThemedText>
              ) : (
                deadStock.map((item) => (
                  <View key={item.id} style={styles.advancedListRow}>
                    <ThemedText style={styles.advancedListLabel}>{item.name}</ThemedText>
                    <ThemedText style={styles.advancedListValue}>
                      {item.stock} in stock • {item.days >= 999 ? 'Never sold' : `${item.days} days`}
                    </ThemedText>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        <View style={styles.filterBlock}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by sale number or method"
            placeholderTextColor={theme.muted}
            style={[
              styles.searchInput,
              { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
            ]}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['All', 'Cash', 'Transfer', 'POS', 'Pay Later'] as const).map((method) => (
              <Pressable
                key={method}
                onPress={() => setFilter(method)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filter === method ? theme.primary : theme.surface,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText style={{ color: filter === method ? '#FFFFFF' : theme.text }}>
                  {method}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {filteredSales.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={[styles.emptyText, { color: theme.muted }]}>
              No sales yet.
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            {filteredSales.map((sale, index) => (
              <View
                key={sale.id}
                style={[styles.row, index > 0 && [styles.rowDivider, { borderTopColor: theme.border }]]}>
                <View style={styles.rowInfo}>
                  <ThemedText style={styles.rowTitle}>Sale #{sale.sale_number}</ThemedText>
                  <ThemedText style={styles.rowMeta}>
                    {(sale.customer_name ?? 'Walk-in customer')} • {sale.payment_method} •{' '}
                    {formatDateTime(sale.created_at)}
                  </ThemedText>
                </View>
                <View style={styles.rowAmounts}>
                  <ThemedText
                    style={styles.rowValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}>
                    {format(sale.subtotal)}
                  </ThemedText>
                  {sale.balance_due > 0 ? (
                    <ThemedText style={styles.rowDue}>Due {format(sale.balance_due)}</ThemedText>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {showStartPicker && Platform.OS !== 'ios' && (
          <DateTimePicker
            value={customStart}
            mode="date"
            display="default"
            onChange={(_event, date) => {
              setShowStartPicker(false);
              if (date) {
                const next = new Date(date);
                next.setHours(0, 0, 0, 0);
                setCustomStart(next);
              }
            }}
          />
        )}
        {showStartPicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="fade" onRequestClose={() => setShowStartPicker(false)}>
            <Pressable style={styles.modalBackdrop} onPress={() => setShowStartPicker(false)}>
              <Pressable style={[styles.modalCard, { backgroundColor: theme.surface }]}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle">Select start date</ThemedText>
                  <Pressable onPress={() => setShowStartPicker(false)}>
                    <ThemedText style={styles.modalDone}>Done</ThemedText>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={customStart}
                  mode="date"
                  display="spinner"
                  textColor={theme.text}
                  onChange={(_event, date) => {
                    if (date) {
                      const next = new Date(date);
                      next.setHours(0, 0, 0, 0);
                      setCustomStart(next);
                    }
                  }}
                />
              </Pressable>
            </Pressable>
          </Modal>
        )}
        {showEndPicker && Platform.OS !== 'ios' && (
          <DateTimePicker
            value={customEnd}
            mode="date"
            display="default"
            onChange={(_event, date) => {
              setShowEndPicker(false);
              if (date) {
                const next = new Date(date);
                next.setHours(23, 59, 59, 999);
                setCustomEnd(next);
              }
            }}
          />
        )}
        {showEndPicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="fade" onRequestClose={() => setShowEndPicker(false)}>
            <Pressable style={styles.modalBackdrop} onPress={() => setShowEndPicker(false)}>
              <Pressable style={[styles.modalCard, { backgroundColor: theme.surface }]}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle">Select end date</ThemedText>
                  <Pressable onPress={() => setShowEndPicker(false)}>
                    <ThemedText style={styles.modalDone}>Done</ThemedText>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={customEnd}
                  mode="date"
                  display="spinner"
                  textColor={theme.text}
                  onChange={(_event, date) => {
                    if (date) {
                      const next = new Date(date);
                      next.setHours(23, 59, 59, 999);
                      setCustomEnd(next);
                    }
                  }}
                />
              </Pressable>
            </Pressable>
          </Modal>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardWrap: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  header: { gap: 8 },
  caption: { fontSize: 14 },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rangeChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  customRangeRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  dateChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateText: {
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryBlock: {
    gap: 6,
  },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 16 },
  summaryMeta: { fontSize: 11 },
  filterBlock: {
    gap: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  lockCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  lockTitle: {
    fontSize: 14,
  },
  lockSubtitle: {
    fontSize: 12,
  },
  lockButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  lockButtonText: {
    fontSize: 12,
    color: '#0F6A3D',
  },
  lockActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  advancedSection: {
    gap: 12,
  },
  advancedCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  advancedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  advancedBlock: {
    flex: 1,
    gap: 4,
  },
  advancedLabel: {
    fontSize: 12,
  },
  advancedValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  advancedDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  advancedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  advancedMeta: {
    fontSize: 12,
  },
  advancedList: {
    gap: 8,
  },
  advancedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  exportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  exportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  exportButtonOutline: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exportOutlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 12,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pillChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  advancedListRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  advancedListLabel: {
    fontSize: 12,
    flex: 1,
  },
  advancedListValue: {
    fontSize: 12,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 52,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  sparkBarWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  sparkBar: {
    borderRadius: 999,
  },
  sparklineLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
  },
  rowInfo: {
    flex: 1,
    gap: 4,
  },
  rowTitle: { fontSize: 15 },
  rowMeta: { fontSize: 12, opacity: 0.6 },
  rowAmounts: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowValue: { fontSize: 14, flexShrink: 1 },
  rowDue: { fontSize: 11, color: '#C2410C' },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDone: {
    fontSize: 12,
    color: '#0F6A3D',
  },
});
