import styles from "./App.module.css";
import "./tokens.css";

export function App(): JSX.Element {
  return (
      <div className={styles["xr-xr-navigation-bar"]}>
        <div className={styles["xr-xr-navigation-bar-2"]}>
          <div className={styles["nav-item-01"]}>
            <img className={`${styles["icon-container"]} ${styles["asset-asset-svg-220:1900"]}`} src="asset-svg-220:1900.svg" alt="Icon container" />
            <p className={styles["label"]}>Label</p>
          </div>
          <div className={styles["nav-item-02"]}>
            <img className={`${styles["icon-container-2"]} ${styles["asset-asset-svg-220:1914"]}`} src="asset-svg-220:1914.svg" alt="Icon container" />
            <p className={styles["label-2"]}>Label</p>
          </div>
          <div className={styles["nav-item-03"]}>
            <img className={`${styles["icon-container-3"]} ${styles["asset-asset-svg-220:1922"]}`} src="asset-svg-220:1922.svg" alt="Icon container" />
            <p className={styles["label-3"]}>Label</p>
          </div>
        </div>
      </div>
  );
}

export default App;
