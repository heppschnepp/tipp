$flagsDir = "C:\workspaces\azure\tipp\client\public\flags"
$codes = @('mx','za','kr','cz','ca','ba','qa','ch','br','ma','ht','gb-sct','us','py','au','tr','de','cw','ci','ec','nl','jp','se','tn','be','eg','ir','nz','es','cv','sa','uy','fr','sn','iq','no','ar','dz','at','jo','pt','cd','uz','co','gb-eng','hr','gh','pa','xx')

foreach($c in $codes) {
    $url = "https://flagcdn.com/h40/$c.png"
    $outFile = "$flagsDir\$c.png"
    Write-Host "Downloading $c..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $outFile -UseBasicParsing
    } catch {
        Write-Host "Failed: $c"
    }
}
Write-Host "Done!"