import React from "react";
import DDOSTabbedView from "./DDOSTabbedView";
import AttackCumulativeDemo from "./AttackCumulativeDemo";

export default function App() {
  const showDemo = window.location.search.includes('demo=cumulative');
  return showDemo ? <AttackCumulativeDemo /> : <DDOSTabbedView />;
}


