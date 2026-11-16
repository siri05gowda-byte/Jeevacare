import React from 'react';

export default function HealthOverviewCard({ 
  title, 
  count, 
  icon, 
  color = 'blue',
  onClick = null,
  className = ''
}) {
  const colorClasses = {
    blue: 'text-jeevacare-blue bg-blue-50 border-blue-200',
    green: 'text-jeevacare-green bg-green-50 border-green-200',
    amber: 'text-jeevacare-amber bg-amber-50 border-amber-200',
    red: 'text-red-600 bg-red-50 border-red-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
  };

  const classes = colorClasses[color] || colorClasses.blue;

  return (
    <div
      onClick={onClick}
      className={`card border ${classes} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color === 'blue' ? 'text-jeevacare-blue' : color === 'green' ? 'text-jeevacare-green' : color === 'amber' ? 'text-jeevacare-amber' : 'text-' + color + '-600'}`}>
            {count}
          </p>
        </div>
        <div className="text-4xl text-gray-200">{icon}</div>
      </div>
    </div>
  );
}
