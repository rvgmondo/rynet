/**
 * The heading and one line above the sign-in form.
 *
 * Payload's sign-in screen has no heading of its own, so this is also the page's h1.
 * Rendered through `admin.components.beforeLogin`, between the logo and the form. The form
 * itself is Payload's, untouched: the second-factor check runs in the Users beforeLogin hook
 * and depends on the stock sign-in request.
 */
export function LoginIntro() {
  return (
    <div className="rn-admin-login-intro">
      <h1 className="rn-admin-login-intro__title">Sign in to Rynet</h1>
      <p className="rn-admin-login-intro__lead">
        The back office for cars, dealerships and enquiries.
      </p>
    </div>
  );
}
