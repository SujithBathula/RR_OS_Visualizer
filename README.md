# Round Robin CPU Scheduling Visualizer

An interactive web-based visualization tool that demonstrates the Round Robin CPU scheduling algorithm with smooth animations.

## Description

This project provides a dynamic and intuitive visual representation of how the Round Robin CPU scheduling algorithm works. The visualization is powered by the Canvas API and requestAnimationFrame for smooth animations, making it an excellent educational tool for understanding process scheduling concepts.

## Features

- Interactive visualization of Round Robin scheduling
- Smooth animations using Canvas API and requestAnimationFrame
- Real-time process execution simulation
- Adjustable time quantum
- Process creation with custom attributes
- Visual representation of:
  - Ready Queue
  - CPU execution
  - Process completion
  - Timeline visualization

## Technologies Used

- HTML5 Canvas API
- CSS3
- JavaScript (ES6+)
- requestAnimationFrame for animations

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- No additional installations required

### Running the Application

1. Clone the repository
2. Open `index.html` in your web browser
3. Start creating processes and watch the Round Robin scheduling in action!

## How to Use

1. Add processes using the input form
2. Set the time quantum for the Round Robin algorithm
3. Click "Start Simulation" to begin the visualization
4. Watch as processes are executed according to the Round Robin algorithm
5. View the final results including waiting times and turnaround times

## Project Structure

```
├── index.html          # Main HTML file
├── css/
│   └── style.css      # Styling
├── js/
│   ├── main.js        # Main application logic
│   ├── utils.js       # Utility functions
│   └── algorithms/
│       └── rr.js      # Round Robin implementation
```

