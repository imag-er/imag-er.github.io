function post(msg)
{
	window.alert(msg);
}
var i;
for (i=0;i<100;i++) {
	post("再按"+(100-i)+"下lsm大佬就放你出去");
	if (i%10==Math.rand()) {
		post("看在你按了"+i+"下的份上就放你出去吧");
		break;
	}
}
	
