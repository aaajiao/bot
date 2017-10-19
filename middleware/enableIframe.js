export default function (context) {
  context.res.removeHeader('X-Frame-Options')
}
