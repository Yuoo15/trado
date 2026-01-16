import styles from "./logo.module.css"
export default (props) =>{
    return(
        <>
            <h1 className={styles.logo} style={{...props.style}}>Trado Beta</h1>
        </>
    )
}