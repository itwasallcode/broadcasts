export function LayoutButtons({ options, layout, onSelect }) {
  return (
    <div className="layout-options">
      {options.map((opt) => (
        <button
          key={opt.value}
          data-value={opt.value}
          className={`layout-btn ${layout === opt.value ? 'active' : ''}`}
          onClick={onSelect}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
