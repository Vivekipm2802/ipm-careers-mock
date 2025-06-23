import Link from 'next/link';
import styles from './GameCard.module.css';

function GameCard(props){

    return(
    <Link href={props.link ?props.link : '#'} legacyBehavior>
    <div className={styles.gameblock + " " + (props.comingsoon ? styles.coming :'')} style={{backgroundImage:"url("+props.image+")"}}>
<p style={{color:props.color}}>{props.GameName}</p>
{props.comingsoon ? <p className={styles.badge}>Coming Soon</p>:''}
<img className={styles.game} src="/gamepad.svg"/>

    </div></Link>)
}
export default GameCard;