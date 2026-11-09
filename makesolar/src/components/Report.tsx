import type { Estimate, Payback, Prices } from "../economics/estimate";
import type { YearSimulation } from "../solar/energy";
import { MONTH_NAMES } from "../solar/energy";
import { MonthChart, PaybackChart } from "./charts";
import { formatNumber } from "../utils/format";

export interface ReportProps {
  snapshot: string | null;
  createdAt: string;
  rows: [string, string][];
  kwp: number;
  panelCount: number;
  year: YearSimulation;
  estimate: Estimate;
  payback: Payback;
  prices: Prices;
}

// Звіт, який бачить лише принтер (і «Зберегти як PDF»)
function Report({ snapshot, createdAt, rows, kwp, panelCount, year, estimate, payback, prices }: ReportProps) {
  const shadeLoss = year.annualNoShadeKwh > 0 ? 1 - year.annualKwh / year.annualNoShadeKwh : 0;

  return (
    <article className="report" aria-hidden="true">
      <header className="report-head">
        <h1>Проєкт сонячної станції</h1>
        <p>MakeSolar · {createdAt}</p>
      </header>

      <div className="report-hero">
        <div>
          <span>Потужність</span>
          <b>{formatNumber(kwp, 2)} кВт</b>
        </div>
        <div>
          <span>Панелей</span>
          <b>{panelCount}</b>
        </div>
        <div>
          <span>Виробіток за рік</span>
          <b>{formatNumber(year.annualKwh)} кВт·год</b>
        </div>
        <div>
          <span>Вартість</span>
          <b>{formatNumber(estimate.total)} грн</b>
        </div>
        <div>
          <span>Окупність</span>
          <b>{payback.paybackYears !== null ? `${formatNumber(payback.paybackYears, 1)} р.` : "понад 25 р."}</b>
        </div>
      </div>

      {snapshot && <img className="report-shot" src={snapshot} alt="3D-модель даху з панелями" />}

      <section>
        <h2>Вихідні дані</h2>
        <table className="report-table">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-break">
        <h2>Виробіток енергії</h2>
        <p>
          Питомий виробіток {formatNumber(year.specificYield)} кВт·год на 1 кВт.
          {shadeLoss > 0.001 && ` Втрати від затінення перешкодами: ${formatNumber(shadeLoss * 100, 1)}%.`}
        </p>
        <MonthChart values={year.months.map((m) => m.kwh)} />
        <table className="report-table report-num">
          <thead>
            <tr>
              {MONTH_NAMES.map((m) => (
                <th key={m}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {year.months.map((m) => (
                <td key={m.month}>{formatNumber(m.kwh)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Кошторис</h2>
        <table className="report-table report-num">
          <thead>
            <tr>
              <th>Позиція</th>
              <th>К-сть</th>
              <th>Ціна, грн</th>
              <th>Сума, грн</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lines.map((l) => (
              <tr key={l.name}>
                <th>{l.name}</th>
                <td>
                  {l.qty} {l.unit}
                </td>
                <td>{formatNumber(l.price)}</td>
                <td>{formatNumber(l.total)}</td>
              </tr>
            ))}
            <tr className="report-total">
              <th>Разом</th>
              <td />
              <td />
              <td>{formatNumber(estimate.total)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Окупність</h2>
        <p>
          Тариф {formatNumber(prices.tariff, 2)} грн/кВт·год.
          Економія за 25 років: {formatNumber(payback.lifetimeSavings)} грн.
        </p>
        <PaybackChart points={payback.points} cost={estimate.total} paybackYears={payback.paybackYears} />
      </section>

      <footer className="report-foot">
        Розрахунок виробітку виконано за моделлю ясного неба з калібруванням за типовими місячними даними для
        Житомира. Ціни в кошторисі орієнтовні ринкові.
      </footer>
    </article>
  );
}

export default Report;
