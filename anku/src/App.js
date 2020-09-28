import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import ContentsPage from "./pages/ContentsPage";
import HaikuPage from "./pages/HaikuPage";

const App = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <ContentsPage />
        </Route>
        <Route exact path="/haiku/:name">
          <HaikuPage />
        </Route>
      </Switch>
    </Router>
  );
};

export default App;
