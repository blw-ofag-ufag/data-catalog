// handle clicks on the burger menu to open/close the mobile menu
const menuButtonElement = document.querySelector('#main-header button.burger')
menuButtonElement.addEventListener('click', () => {
  document.body.classList.toggle('body--mobile-menu-is-open')
})
