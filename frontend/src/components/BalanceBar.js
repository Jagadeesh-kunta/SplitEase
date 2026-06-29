// Renders one member's balance as a horizontal bar that fills
// right (green) if they're owed money, or left (red/coral) if
// they owe money — like a tug-of-war centered at zero.
// `maxAbs` is the largest |balance| in the group, used to scale all bars consistently.
export default function BalanceBar({ name, balance, maxAbs }) {
  const isZero = Math.abs(balance) < 0.01;
  const isCredit = balance > 0;

  // Scale the fill width relative to the largest balance in the group (min 4%, max 50% of half-track)
  const pct = maxAbs > 0 ? Math.max(4, Math.min(100, (Math.abs(balance) / maxAbs) * 100)) : 0;

  let figureClass = 'zero';
  let figureText = 'settled up';
  if (!isZero) {
    figureClass = isCredit ? 'credit' : 'debit';
    figureText = isCredit
      ? `gets back ₹${balance.toFixed(2)}`
      : `owes ₹${Math.abs(balance).toFixed(2)}`;
  }

  return (
    <div className="balance-row">
      <div className="balance-row-top">
        <span className="balance-name">{name}</span>
        <span className={`balance-figure ${figureClass}`}>{figureText}</span>
      </div>
      <div className="balance-track">
        <div className="balance-midline" />
        {!isZero && (
          <div
            className={`balance-fill ${isCredit ? 'credit' : 'debit'}`}
            style={{ width: `${pct / 2}%` }}
          />
        )}
      </div>
    </div>
  );
}
