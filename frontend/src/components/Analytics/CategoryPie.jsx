/**
 * CategoryPie.jsx — Pie chart showing donation distribution.
 * Memoized to prevent unnecessary re-renders.
 */

import { memo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

/** Color palette for pie segments */
const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

/**
 * @param {Object} props
 * @param {Array} props.data - [{name, value}].
 * @param {string} [props.title] - Chart title.
 */
function CategoryPie({ data = [], title = "Distribution" }) {
  if (data.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-dark-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-dark-100 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "12px",
              color: "#f1f5f9",
            }}
          />
          <Legend
            wrapperStyle={{ color: "#94a3b8", fontSize: "12px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(CategoryPie);
