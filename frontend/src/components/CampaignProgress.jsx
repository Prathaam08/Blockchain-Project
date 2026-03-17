/**
 * CampaignProgress.jsx — Milestone progress bar component.
 */

/**
 * @param {Object} props
 * @param {Object} props.campaign - Campaign data.
 * @param {Array} [props.milestones] - Array of milestone objects.
 */
export default function CampaignProgress({ campaign, milestones = [] }) {
  const funded = campaign?.funded_eth || campaign?.totalFunded || 0;
  const target = campaign?.target_eth || campaign?.totalTarget || 1;
  const percentage = Math.min((funded / target) * 100, 100);

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-dark-50 mb-2">
        {campaign?.title || "Campaign"}
      </h3>
      {campaign?.description && (
        <p className="text-sm text-dark-400 mb-4">{campaign.description}</p>
      )}

      {/* Funding Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-dark-300">Funded</span>
          <span className="font-semibold text-primary-400">
            {parseFloat(funded).toFixed(2)} / {parseFloat(target).toFixed(2)} ETH
          </span>
        </div>
        <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-dark-500 mt-1 text-right">
          {percentage.toFixed(1)}%
        </p>
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-dark-300 uppercase tracking-wider">
            Milestones
          </h4>
          {milestones.map((milestone, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                milestone.approved
                  ? "border-primary-500/30 bg-primary-500/5"
                  : "border-dark-600 bg-dark-800/50"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  milestone.approved
                    ? "bg-primary-500 text-white"
                    : "bg-dark-700 text-dark-400"
                }`}
              >
                {milestone.approved ? "✓" : index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-dark-200">
                  {milestone.description}
                </p>
                <p className="text-xs text-dark-500">
                  Target: {parseFloat(milestone.target_eth || 0).toFixed(2)} ETH
                </p>
              </div>
              {milestone.approved && (
                <span className="badge-success">Approved</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
