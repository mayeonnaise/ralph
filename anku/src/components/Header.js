import React from "react";
import HeaderStyles from "./Header.module.css";

function Header() {
  return (
    <div className={HeaderStyles.header}>
      <span className={HeaderStyles.headerTitle}>ANKU</span>
      <div className={HeaderStyles.navbar}>
        <span>ABOUT</span>
        <span>CONTACT</span>
      </div>
    </div>
  );
}

export default Header;
