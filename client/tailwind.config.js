export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // JeevaCare Brand Colors
        'jeevacare-blue': '#1e3a8a',
        'jeevacare-light-blue': '#3b82f6',
        'jeevacare-navy': '#0f172a',
        'jeevacare-green': '#10b981',
        'jeevacare-amber': '#f59e0b',
        'jeevacare-red': '#ef4444',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
