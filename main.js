var cnt=0;
function up()
{
    var mv=document.getElementById("mv");
    if (!cnt)
    {
        //close
        mv.style.left="110px";
        mv.parentElement.style.background="#65C466";
        mv.style.width="80px";
        cnt=1;
    }
    else
    {
        //open
        mv.style.left="10px";
        mv.parentElement.style.background="#E9E9EA";
        mv.style.width="80px";
        cnt=0;
    }
}
function down()
{
    var mv=document.getElementById("mv");
    mv.style.width="100px"
    if (!cnt)
    {
        //
    }
    else
    {
        mv.style.left="90px";
    }
}