    // tailwind.config.js
    /** @type {import('tailwindcss').Config} */
    module.exports = {
      // These paths tell Tailwind CSS where to scan for your utility classes.
      // Adjust them based on your project's structure (e.g., if you use a 'src' folder).
      content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        // If you are using a 'src' directory, you might need this:
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
      ],
      // This enables Tailwind's dark mode based on the presence of a 'dark' class
      // on the HTML element (which your SettingsPage component manages).
      darkMode: 'class',
      theme: {
        extend: {
          // You can extend Tailwind's default theme here, for example:
          // colors: {
          //   'primary-blue': '#247BA0',
          // },
          // fontFamily: {
          //   sans: ['Inter', 'sans-serif'],
          // },
        },
      },
      plugins: [], // Add any Tailwind plugins here (e.g., @tailwindcss/forms)
    };